import { createHmac, timingSafeEqual } from 'node:crypto';
import { env } from '../../config/env.ts';
import type { CashfreePaymentSession, PaymentGatewayMode } from './payments.types.ts';

interface CreateCashfreeOrderInput {
  orderId: string;
  amount: number;
  customerId: string;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string;
  note: string;
}

interface CashfreeWebhookPayload {
  type?: string;
  data?: {
    order?: {
      order_id?: string;
      order_amount?: number;
      order_currency?: string;
      order_status?: string;
    };
    payment?: {
      cf_payment_id?: string;
      payment_status?: string;
      payment_amount?: number;
      payment_currency?: string;
      payment_time?: string;
      bank_reference?: string;
    };
  };
}

const MOCK_CASHFREE_WEBHOOK_SECRET = 'cashfree_mock_webhook_secret';
const CASHFREE_WEBHOOK_MAX_AGE_SECONDS = Number.parseInt(
  process.env.CASHFREE_WEBHOOK_MAX_AGE_SECONDS || '300',
  10,
);
const CASHFREE_MIN_ORDER_EXPIRY_MINUTES = 16;
const CASHFREE_MAX_ORDER_EXPIRY_MINUTES = (30 * 24 * 60) - 1;
const DEFAULT_CASHFREE_ORDER_EXPIRY_MINUTES = 20;
const processedCashfreeWebhooks = new Map<string, number>();
const CASHFREE_API_TIMEOUT_MS = 30_000;

function buildCashfreeHeaders(
  options: {
    includeCredentials?: boolean;
    includeContentType?: boolean;
    requestId?: string;
  } = {},
): Record<string, string> {
  const headers: Record<string, string> = {
    accept: 'application/json',
    'x-api-version': env.cashfreeApiVersion,
  };

  if (options.includeContentType) {
    headers['content-type'] = 'application/json';
  }

  if (options.requestId) {
    headers['x-request-id'] = options.requestId;
  }

  if (options.includeCredentials) {
    headers['x-client-id'] = env.cashfreeAppId;
    headers['x-client-secret'] = env.cashfreeSecretKey;
  }

  return headers;
}

function normalizeCashfreeCustomerPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');

  if (digits.length === 10) {
    return digits;
  }

  if (digits.length === 12 && digits.startsWith('91')) {
    return digits.slice(-10);
  }

  if (digits.length === 11 && digits.startsWith('0')) {
    return digits.slice(-10);
  }

  throw new Error('Cashfree requires a 10-digit customer phone number');
}

function normalizeCashfreeCustomerId(customerId: string): string {
  const normalizedId = customerId.trim().replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 50);

  if (!normalizedId) {
    throw new Error('Cashfree requires a valid customer ID');
  }

  return normalizedId;
}

function normalizeCashfreeOrderId(orderId: string): string {
  const normalizedOrderId = orderId.trim().replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 50);

  if (!normalizedOrderId) {
    throw new Error('Cashfree requires a valid order ID');
  }

  return normalizedOrderId;
}

function isValidCashfreeEmail(email: string | null | undefined): email is string {
  if (!email) {
    return false;
  }

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function getCashfreeOrderExpiryMinutes(): number {
  const configuredMinutes = Number.parseInt(
    process.env.CASHFREE_ORDER_EXPIRY_MINUTES || `${DEFAULT_CASHFREE_ORDER_EXPIRY_MINUTES}`,
    10,
  );

  if (!Number.isFinite(configuredMinutes)) {
    return DEFAULT_CASHFREE_ORDER_EXPIRY_MINUTES;
  }

  return Math.min(
    CASHFREE_MAX_ORDER_EXPIRY_MINUTES,
    Math.max(CASHFREE_MIN_ORDER_EXPIRY_MINUTES, configuredMinutes),
  );
}

function parseJsonRecord(responseText: string): Record<string, unknown> | null {
  try {
    return responseText ? (JSON.parse(responseText) as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

function getNestedString(
  source: Record<string, unknown> | null,
  ...keys: string[]
): string | null {
  let current: unknown = source;

  for (const key of keys) {
    if (!current || typeof current !== 'object' || Array.isArray(current)) {
      return null;
    }

    current = (current as Record<string, unknown>)[key];
  }

  return typeof current === 'string' && current.trim() ? current : null;
}

function getCashfreeErrorMessage(
  payload: Record<string, unknown> | null,
  fallback: string,
): string {
  const message =
    getNestedString(payload, 'message') ||
    getNestedString(payload, 'error', 'message') ||
    getNestedString(payload, 'error_description') ||
    fallback;
  const code =
    getNestedString(payload, 'code') ||
    getNestedString(payload, 'error_code') ||
    getNestedString(payload, 'type');
  const fieldMessage =
    getNestedString(payload, 'error_details') ||
    getNestedString(payload, 'field') ||
    getNestedString(payload, 'error', 'field');

  if (code && fieldMessage) {
    return `${message} (${code}: ${fieldMessage})`;
  }

  if (code) {
    return `${message} (${code})`;
  }

  return message;
}

function getNumericValue(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim() !== '') {
    const parsedValue = Number.parseFloat(value.trim());
    return Number.isFinite(parsedValue) ? parsedValue : null;
  }

  return null;
}

function extractCheckoutUrl(payload: Record<string, unknown> | null): string | null {
  return (
    getNestedString(payload, 'payment_link') ||
    getNestedString(payload, 'payment_link_url') ||
    getNestedString(payload, 'data', 'url') ||
    getNestedString(payload, 'data', 'payload', 'url') ||
    getNestedString(payload, 'data', 'payload', 'link') ||
    getNestedString(payload, 'order_meta', 'payment_link') ||
    null
  );
}

function extractUpiIntent(payload: Record<string, unknown> | null): string | null {
  const candidates = [
    getNestedString(payload, 'data', 'payload', 'upi_intent'),
    getNestedString(payload, 'data', 'payload', 'upiIntent'),
    getNestedString(payload, 'data', 'payload', 'intent_url'),
    getNestedString(payload, 'data', 'payload', 'deeplink'),
    getNestedString(payload, 'data', 'payload', 'upi_link'),
    getNestedString(payload, 'data', 'payload', 'value'),
  ];

  return candidates.find((value) => Boolean(value?.startsWith('upi://'))) ?? null;
}

function getMode(): PaymentGatewayMode {
  const configuredMode = env.cashfreeMode;

  if (
    configuredMode === 'mock' ||
    configuredMode === 'sandbox' ||
    configuredMode === 'production'
  ) {
    return configuredMode;
  }

  return 'mock';
}

function getCashfreeApiBase(mode: PaymentGatewayMode): string {
  return mode === 'production'
    ? 'https://api.cashfree.com/pg'
    : 'https://sandbox.cashfree.com/pg';
}

function getWebhookSigningSecret(): string {
  return (
    env.cashfreeWebhookSecret ||
    env.cashfreeSecretKey ||
    (getMode() === 'mock' ? MOCK_CASHFREE_WEBHOOK_SECRET : '')
  );
}

function getCashfreeWebhookFingerprint(
  timestamp: string | null | undefined,
  signature: string | null | undefined,
): string | null {
  const normalizedTimestamp = timestamp?.trim();
  const normalizedSignature = signature?.trim();

  if (!normalizedTimestamp || !normalizedSignature) {
    return null;
  }

  return `${normalizedTimestamp}:${normalizedSignature}`;
}

function cleanupProcessedCashfreeWebhooks(nowMs: number): void {
  for (const [fingerprint, expiresAt] of processedCashfreeWebhooks.entries()) {
    if (expiresAt <= nowMs) {
      processedCashfreeWebhooks.delete(fingerprint);
    }
  }
}

function parseWebhookTimestampMs(timestamp: string | null | undefined): number | null {
  if (!timestamp) {
    return null;
  }

  const normalizedTimestamp = timestamp.trim();

  if (!normalizedTimestamp) {
    return null;
  }

  if (/^\d+$/.test(normalizedTimestamp)) {
    const numericTimestamp = Number.parseInt(normalizedTimestamp, 10);

    if (!Number.isFinite(numericTimestamp)) {
      return null;
    }

    return normalizedTimestamp.length <= 10 ? numericTimestamp * 1000 : numericTimestamp;
  }

  const parsedTimestamp = Date.parse(normalizedTimestamp);
  return Number.isNaN(parsedTimestamp) ? null : parsedTimestamp;
}

function isWebhookTimestampFresh(timestamp: string | null | undefined): boolean {
  const parsedTimestampMs = parseWebhookTimestampMs(timestamp);

  if (parsedTimestampMs == null) {
    return false;
  }

  const nowMs = Date.now();
  const maxAgeMs = Math.max(60, CASHFREE_WEBHOOK_MAX_AGE_SECONDS) * 1000;

  return Math.abs(nowMs - parsedTimestampMs) <= maxAgeMs;
}

function buildMockCashfreeSession(input: CreateCashfreeOrderInput): CashfreePaymentSession {
  const expiresAt = new Date(Date.now() + getCashfreeOrderExpiryMinutes() * 60 * 1000);
  const amount = input.amount.toFixed(2);
  const upiIntent = `upi://pay?pa=demo@cashfree&pn=${encodeURIComponent(
    'Coffee aur Kitaab',
  )}&tr=${encodeURIComponent(input.orderId)}&am=${amount}&cu=INR&tn=${encodeURIComponent(
    input.note,
  )}`;

  return {
    provider: 'cashfree',
    mode: 'mock',
    order_id: input.orderId,
    cf_order_id: null,
    payment_session_id: `mock_session_${input.orderId}`,
    checkout_url: `https://mock.cashfree.local/pay/${encodeURIComponent(input.orderId)}`,
    upi_intent: upiIntent,
    expires_at: expiresAt,
    order_status: 'ACTIVE',
    note: 'Mock Cashfree session generated locally. Replace env keys later for real Cashfree.',
  };
}

async function createCashfreeHostedUpiLink(
  mode: PaymentGatewayMode,
  paymentSessionId: string,
): Promise<{
  checkoutUrl: string | null;
  upiIntent: string | null;
}> {
  let response: Response;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CASHFREE_API_TIMEOUT_MS);

    try {
      response = await fetch(`${getCashfreeApiBase(mode)}/orders/sessions`, {
        method: 'POST',
        headers: {
          ...buildCashfreeHeaders({
            includeCredentials: true,
            includeContentType: true,
            requestId: paymentSessionId,
          }),
          'x-client-device': 'desktop',
          'x-client-os': 'windows',
          'x-client-browser': 'chrome',
        },
        body: JSON.stringify({
          payment_session_id: paymentSessionId,
          payment_method: {
            upi: {
              channel: 'link',
            },
          },
        }),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown network error';
    throw new Error(
      `Cashfree hosted-link request failed. Check internet access, DNS/firewall rules, and sandbox credentials. ${message}`,
    );
  }

  const responseText = await response.text();
  const parsedResponse = parseJsonRecord(responseText);

  if (!response.ok) {
    throw new Error(
      getCashfreeErrorMessage(
        parsedResponse,
        'Cashfree could not create a hosted UPI payment link for this order',
      ),
    );
  }

  return {
    checkoutUrl: extractCheckoutUrl(parsedResponse),
    upiIntent: extractUpiIntent(parsedResponse),
  };
}

export async function createCashfreePaymentSession(
  input: CreateCashfreeOrderInput,
): Promise<CashfreePaymentSession> {
  const mode = getMode();

  if (mode === 'mock') {
    return buildMockCashfreeSession(input);
  }

  if (!env.cashfreeAppId || !env.cashfreeSecretKey) {
    throw new Error(
      'Cashfree credentials are missing. Set CASHFREE_APP_ID/CASHFREE_CLIENT_ID and CASHFREE_SECRET_KEY/CASHFREE_CLIENT_SECRET',
    );
  }

  const normalizedOrderId = normalizeCashfreeOrderId(input.orderId);
  const normalizedCustomerId = normalizeCashfreeCustomerId(input.customerId);
  const customerPhone = normalizeCashfreeCustomerPhone(input.customerPhone);
  // Cashfree requires order_expiry_time to be strictly more than 15 minutes away.
  const orderExpiryTime = new Date(
    Date.now() + getCashfreeOrderExpiryMinutes() * 60 * 1000,
  ).toISOString();
  const customerDetails: Record<string, string> = {
    customer_id: normalizedCustomerId,
    customer_phone: customerPhone,
  };

  if (input.customerName.trim()) {
    customerDetails.customer_name = input.customerName.trim().slice(0, 100);
  }

  if (isValidCashfreeEmail(input.customerEmail)) {
    customerDetails.customer_email = input.customerEmail.trim();
  }

  const requestBody = {
    order_id: normalizedOrderId,
    order_amount: Number(input.amount.toFixed(2)),
    order_currency: 'INR',
    customer_details: customerDetails,
    order_expiry_time: orderExpiryTime,
  };

  let response: Response;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CASHFREE_API_TIMEOUT_MS);

    try {
      response = await fetch(`${getCashfreeApiBase(mode)}/orders`, {
        method: 'POST',
        headers: buildCashfreeHeaders({
          includeCredentials: true,
          includeContentType: true,
          requestId: normalizedOrderId,
        }),
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown network error';
    throw new Error(
      `Cashfree order creation request failed. Check internet access, DNS/firewall rules, and sandbox credentials. ${message}`,
    );
  }

  const responseText = await response.text();
  const parsedResponse = parseJsonRecord(responseText);

  if (!response.ok) {
    throw new Error(getCashfreeErrorMessage(parsedResponse, 'Cashfree order creation failed'));
  }

  const paymentSessionId =
    typeof parsedResponse?.payment_session_id === 'string'
      ? parsedResponse.payment_session_id
      : null;

  if (!paymentSessionId) {
    throw new Error('Cashfree did not return a payment_session_id');
  }

  const checkoutUrl = extractCheckoutUrl(parsedResponse);
  const upiIntent = extractUpiIntent(parsedResponse);

  return {
    provider: 'cashfree',
    mode,
    order_id: input.orderId,
    cf_order_id:
      typeof parsedResponse?.cf_order_id === 'string' ? parsedResponse.cf_order_id : null,
    payment_session_id: paymentSessionId,
    checkout_url: checkoutUrl,
    upi_intent: upiIntent,
    expires_at: orderExpiryTime ? new Date(orderExpiryTime) : null,
    order_status:
      typeof parsedResponse?.order_status === 'string' ? parsedResponse.order_status : 'ACTIVE',
    note: `Cashfree ${mode} session created.`,
  };
}

export function verifyCashfreeWebhookSignature(
  rawPayload: string,
  timestamp: string | null | undefined,
  signature: string | null | undefined,
): boolean {
  const signingSecret = getWebhookSigningSecret();
  const normalizedTimestamp = timestamp?.trim();
  const normalizedSignature = signature?.trim();

  if (!signingSecret || !normalizedTimestamp || !normalizedSignature) {
    return false;
  }

  const signedPayload = `${normalizedTimestamp}${rawPayload}`;
  const expectedSignature = createHmac('sha256', signingSecret)
    .update(signedPayload)
    .digest('base64');

  const providedBuffer = Buffer.from(normalizedSignature, 'utf8');
  const expectedBuffer = Buffer.from(expectedSignature, 'utf8');

  if (providedBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(providedBuffer, expectedBuffer);
}

export function validateCashfreeWebhookRequest(
  rawPayload: string,
  timestamp: string | null | undefined,
  signature: string | null | undefined,
): { isValid: boolean; isDuplicate: boolean; error: string | null } {
  if (!verifyCashfreeWebhookSignature(rawPayload, timestamp, signature)) {
    return {
      isValid: false,
      isDuplicate: false,
      error: 'Invalid Cashfree webhook signature',
    };
  }

  if (!isWebhookTimestampFresh(timestamp)) {
    return {
      isValid: false,
      isDuplicate: false,
      error: 'Cashfree webhook timestamp is invalid or too old',
    };
  }

  const fingerprint = getCashfreeWebhookFingerprint(timestamp, signature);
  const nowMs = Date.now();

  cleanupProcessedCashfreeWebhooks(nowMs);

  if (fingerprint && processedCashfreeWebhooks.has(fingerprint)) {
    return {
      isValid: true,
      isDuplicate: true,
      error: null,
    };
  }

  return {
    isValid: true,
    isDuplicate: false,
    error: null,
  };
}

export function rememberProcessedCashfreeWebhook(
  timestamp: string | null | undefined,
  signature: string | null | undefined,
): void {
  const fingerprint = getCashfreeWebhookFingerprint(timestamp, signature);

  if (!fingerprint) {
    return;
  }

  const nowMs = Date.now();
  const maxAgeMs = Math.max(60, CASHFREE_WEBHOOK_MAX_AGE_SECONDS) * 1000;

  cleanupProcessedCashfreeWebhooks(nowMs);
  processedCashfreeWebhooks.set(fingerprint, nowMs + maxAgeMs);
}

export function buildMockCashfreeWebhookPayload(input: {
  orderId: string;
  amount: number;
  cfPaymentId?: string;
  paidAt?: string;
}): {
  payload: CashfreeWebhookPayload;
  rawBody: string;
  timestamp: string;
  signature: string;
} {
  const timestamp = Date.now().toString();
  const payload: CashfreeWebhookPayload = {
    type: 'PAYMENT_SUCCESS_WEBHOOK',
    data: {
      order: {
        order_id: input.orderId,
        order_amount: input.amount,
        order_currency: 'INR',
        order_status: 'PAID',
      },
      payment: {
        cf_payment_id:
          input.cfPaymentId ?? `mock_cf_${input.orderId}_${Math.floor(Date.now() / 1000)}`,
        payment_status: 'SUCCESS',
        payment_amount: input.amount,
        payment_currency: 'INR',
        payment_time: input.paidAt ?? new Date().toISOString(),
        bank_reference: `mock_bank_${input.orderId}`,
      },
    },
  };
  const rawBody = JSON.stringify(payload);
  const signingSecret = getWebhookSigningSecret();
  const signature = createHmac('sha256', signingSecret)
    .update(`${timestamp}${rawBody}`)
    .digest('base64');

  return {
    payload,
    rawBody,
    timestamp,
    signature,
  };
}

export function parseCashfreeSuccessfulPaymentWebhook(payload: unknown): {
  orderId: string;
  cfPaymentId: string | null;
  amount: number | null;
  paidAt: string | undefined;
} | null {
  const webhookPayload = payload as CashfreeWebhookPayload | null;
  const paymentStatus = webhookPayload?.data?.payment?.payment_status?.toUpperCase();
  const orderStatus = webhookPayload?.data?.order?.order_status?.toUpperCase();

  if (paymentStatus !== 'SUCCESS' && orderStatus !== 'PAID') {
    return null;
  }

  const orderId = webhookPayload?.data?.order?.order_id?.trim();

  if (!orderId) {
    return null;
  }

  return {
    orderId,
    cfPaymentId: webhookPayload?.data?.payment?.cf_payment_id ?? null,
    amount:
      getNumericValue(webhookPayload?.data?.payment?.payment_amount) ??
      getNumericValue(webhookPayload?.data?.order?.order_amount),
    paidAt: webhookPayload?.data?.payment?.payment_time,
  };
}
