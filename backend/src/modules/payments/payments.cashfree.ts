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
  return (
    getNestedString(payload, 'message') ||
    getNestedString(payload, 'error', 'message') ||
    getNestedString(payload, 'error_description') ||
    fallback
  );
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

function buildMockCashfreeSession(input: CreateCashfreeOrderInput): CashfreePaymentSession {
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
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
  const response = await fetch(`${getCashfreeApiBase(mode)}/orders/sessions`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-version': env.cashfreeApiVersion,
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
  });

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
    throw new Error('Cashfree credentials are missing. Set CASHFREE_APP_ID and CASHFREE_SECRET_KEY');
  }

  const orderExpiryTime = new Date(Date.now() + 15 * 60 * 1000).toISOString();
  const requestBody = {
    order_id: input.orderId,
    order_amount: Number(input.amount.toFixed(2)),
    order_currency: 'INR',
    customer_details: {
      customer_id: input.customerId,
      customer_name: input.customerName,
      customer_phone: input.customerPhone,
      customer_email: input.customerEmail ?? `${input.customerId}@example.invalid`,
    },
    order_note: input.note,
    order_expiry_time: orderExpiryTime,
  };

  const response = await fetch(`${getCashfreeApiBase(mode)}/orders`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-version': env.cashfreeApiVersion,
      'x-client-id': env.cashfreeAppId,
      'x-client-secret': env.cashfreeSecretKey,
    },
    body: JSON.stringify(requestBody),
  });

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

  const baseCheckoutUrl = extractCheckoutUrl(parsedResponse);
  const baseUpiIntent = extractUpiIntent(parsedResponse);
  const hostedUpiLink = await createCashfreeHostedUpiLink(mode, paymentSessionId);

  return {
    provider: 'cashfree',
    mode,
    order_id: input.orderId,
    cf_order_id:
      typeof parsedResponse?.cf_order_id === 'string' ? parsedResponse.cf_order_id : null,
    payment_session_id: paymentSessionId,
    checkout_url: hostedUpiLink.checkoutUrl ?? baseCheckoutUrl,
    upi_intent: hostedUpiLink.upiIntent ?? baseUpiIntent,
    expires_at: orderExpiryTime ? new Date(orderExpiryTime) : null,
    order_status:
      typeof parsedResponse?.order_status === 'string' ? parsedResponse.order_status : 'ACTIVE',
    note:
      'Cashfree live session created. Show the QR on the admin screen so the student can scan it with any UPI app.',
  };
}

export function verifyCashfreeWebhookSignature(
  rawPayload: string,
  timestamp: string | null | undefined,
  signature: string | null | undefined,
): boolean {
  const signingSecret = getWebhookSigningSecret();

  if (!signingSecret || !timestamp || !signature) {
    return false;
  }

  const signedPayload = `${timestamp}${rawPayload}`;
  const expectedSignature = createHmac('sha256', signingSecret)
    .update(signedPayload)
    .digest('base64');

  const providedBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (providedBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(providedBuffer, expectedBuffer);
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
      typeof webhookPayload?.data?.payment?.payment_amount === 'number'
        ? webhookPayload.data.payment.payment_amount
        : typeof webhookPayload?.data?.order?.order_amount === 'number'
          ? webhookPayload.data.order.order_amount
          : null,
    paidAt: webhookPayload?.data?.payment?.payment_time,
  };
}
