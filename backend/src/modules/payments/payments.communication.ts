import type {
  PaymentCommunicationChannel,
  PaymentCommunicationDeliveryMode,
  PaymentCommunicationStatus,
  PaymentReminderStage,
  PendingPayment,
  ReceiptData,
} from './payments.types.ts';

interface DispatchPaymentCommunicationInput {
  channel: PaymentCommunicationChannel;
  recipientPhone: string;
  recipientEmail: string | null;
  subject: string | null;
  messageBody: string;
  metadata: Record<string, unknown>;
}

interface DispatchPaymentCommunicationResult {
  deliveryStatus: PaymentCommunicationStatus;
  deliveryMode: PaymentCommunicationDeliveryMode;
  providerName: string | null;
  externalMessageId: string | null;
}

interface TwilioConfiguration {
  accountSid: string | null;
  authToken: string | null;
  smsFrom: string | null;
  whatsappFrom: string | null;
  defaultCountryCode: string;
}

function formatCurrency(amount: number): string {
  return `Rs ${amount.toLocaleString('en-IN')}`;
}

function formatDisplayDate(value: Date): string {
  return value.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function readEnvValue(name: string): string | null {
  const value = process.env[name]?.trim();
  return value ? value : null;
}

function buildDispatchResult(
  deliveryStatus: PaymentCommunicationStatus,
  deliveryMode: PaymentCommunicationDeliveryMode,
  providerName: string | null,
  externalMessageId: string | null = null,
): DispatchPaymentCommunicationResult {
  return {
    deliveryStatus,
    deliveryMode,
    providerName,
    externalMessageId,
  };
}

function getTwilioConfiguration(): TwilioConfiguration {
  return {
    accountSid: readEnvValue('TWILIO_ACCOUNT_SID'),
    authToken: readEnvValue('TWILIO_AUTH_TOKEN'),
    smsFrom: readEnvValue('TWILIO_SMS_FROM'),
    whatsappFrom: readEnvValue('TWILIO_WHATSAPP_FROM'),
    defaultCountryCode: readEnvValue('COMMUNICATION_DEFAULT_COUNTRY_CODE') ?? '+91',
  };
}

export function normalizePhoneNumber(
  rawPhoneNumber: string,
  defaultCountryCode: string = '+91',
): string {
  const trimmedValue = rawPhoneNumber.trim();

  if (!trimmedValue) {
    throw new Error('Recipient phone number is missing');
  }

  const cleanedCountryCode = defaultCountryCode.startsWith('+')
    ? `+${defaultCountryCode.slice(1).replace(/\D/g, '')}`
    : `+${defaultCountryCode.replace(/\D/g, '')}`;
  const digitsOnly = trimmedValue.replace(/\D/g, '');

  if (trimmedValue.startsWith('+')) {
    return `+${trimmedValue.slice(1).replace(/\D/g, '')}`;
  }

  if (trimmedValue.startsWith('00')) {
    return `+${trimmedValue.slice(2).replace(/\D/g, '')}`;
  }

  if (digitsOnly.length === 10) {
    return `${cleanedCountryCode}${digitsOnly}`;
  }

  if (digitsOnly.length >= 11) {
    return `+${digitsOnly}`;
  }

  throw new Error('Recipient phone number is not valid for provider delivery');
}

function formatTwilioSender(
  sender: string,
  channel: PaymentCommunicationChannel,
  defaultCountryCode: string,
): string {
  if (channel === 'whatsapp') {
    if (sender.startsWith('whatsapp:')) {
      return sender;
    }

    if (/^[+\d]/.test(sender)) {
      return `whatsapp:${normalizePhoneNumber(sender, defaultCountryCode)}`;
    }

    return sender;
  }

  if (/^[+\d]/.test(sender)) {
    return normalizePhoneNumber(sender, defaultCountryCode);
  }

  return sender;
}

function formatTwilioRecipient(
  recipientPhone: string,
  channel: PaymentCommunicationChannel,
  defaultCountryCode: string,
): string {
  const normalizedPhone = normalizePhoneNumber(recipientPhone, defaultCountryCode);
  return channel === 'whatsapp' ? `whatsapp:${normalizedPhone}` : normalizedPhone;
}

async function dispatchViaWebhook(
  input: DispatchPaymentCommunicationInput,
  webhookUrl: string,
  providerName: string,
): Promise<DispatchPaymentCommunicationResult> {
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        channel: input.channel,
        recipient_phone: input.recipientPhone,
        recipient_email: input.recipientEmail,
        subject: input.subject,
        message: input.messageBody,
        metadata: input.metadata,
      }),
    });

    let externalMessageId: string | null = null;

    try {
      const responseBody = (await response.json()) as { message_id?: string | null };
      externalMessageId = responseBody.message_id ?? null;
    } catch {
      externalMessageId = null;
    }

    return buildDispatchResult(
      response.ok ? 'sent' : 'failed',
      'webhook',
      providerName,
      externalMessageId,
    );
  } catch (error) {
    console.error('Communication webhook delivery failed:', error);
    return buildDispatchResult('failed', 'webhook', providerName);
  }
}

async function dispatchViaTwilio(
  input: DispatchPaymentCommunicationInput,
): Promise<DispatchPaymentCommunicationResult> {
  const config = getTwilioConfiguration();

  if (!config.accountSid || !config.authToken) {
    console.error('Twilio delivery is configured but account credentials are missing.');
    return buildDispatchResult('failed', 'provider', 'twilio');
  }

  const sender = input.channel === 'sms' ? config.smsFrom : config.whatsappFrom;

  if (!sender) {
    console.error(`Twilio ${input.channel} sender is missing.`);
    return buildDispatchResult('failed', 'provider', 'twilio');
  }

  try {
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${config.accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${Buffer.from(
            `${config.accountSid}:${config.authToken}`,
          ).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          To: formatTwilioRecipient(
            input.recipientPhone,
            input.channel,
            config.defaultCountryCode,
          ),
          From: formatTwilioSender(sender, input.channel, config.defaultCountryCode),
          Body: input.messageBody,
        }).toString(),
      },
    );

    const responseBody = (await response.json().catch(() => null)) as
      | { sid?: string | null; message?: string }
      | null;

    if (!response.ok) {
      console.error('Twilio delivery failed:', responseBody);
    }

    return buildDispatchResult(
      response.ok ? 'sent' : 'failed',
      'provider',
      'twilio',
      responseBody?.sid ?? null,
    );
  } catch (error) {
    console.error('Twilio communication delivery failed:', error);
    return buildDispatchResult('failed', 'provider', 'twilio');
  }
}

export function resolveRequestedChannels(
  requestedChannel: PaymentCommunicationChannel | 'both' | undefined,
): PaymentCommunicationChannel[] {
  if (requestedChannel === 'sms') {
    return ['sms'];
  }

  if (requestedChannel === 'whatsapp') {
    return ['whatsapp'];
  }

  return ['sms', 'whatsapp'];
}

// FIX: Added before_7_days stage — covers 4-7 day window that was previously returning null
export function getRecommendedReminderStage(
  pendingPayment: PendingPayment,
): PaymentReminderStage | null {
  if (pendingPayment.due_status === 'overdue') {
    return 'overdue';
  }

  if (pendingPayment.due_status === 'due_today') {
    return 'due_today';
  }

  if (pendingPayment.days_until_due <= 3) {
    return 'before_3_days';
  }

  if (pendingPayment.days_until_due <= 7) {
    return 'before_7_days';
  }

  return null;
}

// FIX: Added before_7_days message case — previously missing, would fall through to overdue message
export function buildReminderMessage(pendingPayment: PendingPayment): {
  stage: PaymentReminderStage;
  subject: string;
  messageBody: string;
} {
  const stage = getRecommendedReminderStage(pendingPayment);

  if (!stage) {
    throw new Error('This student is not yet within the reminder window');
  }

  const nextDueDate = formatDisplayDate(pendingPayment.next_due_date);
  const amount = formatCurrency(
    pendingPayment.due_status === 'due_soon'
      ? pendingPayment.renewal_amount
      : pendingPayment.total_pending,
  );

  if (stage === 'before_7_days') {
    return {
      stage,
      subject: `Fee reminder for ${pendingPayment.student_name}`,
      messageBody: [
        `Reminder from ${pendingPayment.branch_name}.`,
        `${pendingPayment.student_name}, your next library fee of ${amount} is due on ${nextDueDate}.`,
        'Please plan to renew within the next week to keep your access active.',
      ].join(' '),
    };
  }

  if (stage === 'before_3_days') {
    return {
      stage,
      subject: `Fee reminder for ${pendingPayment.student_name}`,
      messageBody: [
        `Reminder from ${pendingPayment.branch_name}.`,
        `${pendingPayment.student_name}, your next library fee of ${amount} is due on ${nextDueDate}.`,
        'Please renew within the next 3 days to keep your access active.',
      ].join(' '),
    };
  }

  if (stage === 'due_today') {
    return {
      stage,
      subject: `Fee due today for ${pendingPayment.student_name}`,
      messageBody: [
        `Reminder from ${pendingPayment.branch_name}.`,
        `${pendingPayment.student_name}, your library fee of ${amount} is due today (${nextDueDate}).`,
        'Please complete the renewal today to avoid interruption.',
      ].join(' '),
    };
  }

  return {
    stage,
    subject: `Fee overdue for ${pendingPayment.student_name}`,
    messageBody: [
      `Reminder from ${pendingPayment.branch_name}.`,
      `${pendingPayment.student_name}, your library fee of ${amount} is overdue since ${nextDueDate}.`,
      'Please renew as soon as possible. Contact the library desk if you need help.',
    ].join(' '),
  };
}

export function buildReceiptMessage(receiptData: ReceiptData): {
  subject: string;
  messageBody: string;
} {
  return {
    subject: `Payment receipt ${receiptData.receipt_number}`,
    messageBody: [
      `Payment received successfully for ${receiptData.student_name} (${receiptData.student_code}).`,
      `Receipt: ${receiptData.receipt_number}.`,
      `Amount: ${formatCurrency(receiptData.amount)}.`,
      `Paid on: ${formatDisplayDate(receiptData.payment_date)}.`,
      `Coverage: ${formatDisplayDate(receiptData.coverage_start_date)} to ${formatDisplayDate(
        receiptData.coverage_end_date,
      )}.`,
      `Mode: ${receiptData.payment_method.toUpperCase()}.`,
      receiptData.transaction_id ? `Reference: ${receiptData.transaction_id}.` : '',
    ]
      .filter(Boolean)
      .join(' '),
  };
}

export async function dispatchPaymentCommunication(
  input: DispatchPaymentCommunicationInput,
): Promise<DispatchPaymentCommunicationResult> {
  const configuredProvider = readEnvValue('COMMUNICATION_PROVIDER')?.toLowerCase() ?? null;
  const webhookUrl = readEnvValue('COMMUNICATION_WEBHOOK_URL');

  if (configuredProvider === 'twilio') {
    return dispatchViaTwilio(input);
  }

  if (configuredProvider === 'webhook') {
    if (!webhookUrl) {
      console.error('Webhook delivery is configured but COMMUNICATION_WEBHOOK_URL is missing.');
      return buildDispatchResult('failed', 'webhook', 'communication-webhook');
    }

    return dispatchViaWebhook(input, webhookUrl, 'communication-webhook');
  }

  if (!configuredProvider && webhookUrl) {
    return dispatchViaWebhook(input, webhookUrl, 'communication-webhook');
  }

  if (!configuredProvider || configuredProvider === 'system-log' || configuredProvider === 'log_only') {
    return buildDispatchResult('logged', 'log_only', 'system-log');
  }

  console.error(`Unsupported communication provider configured: ${configuredProvider}`);
  return buildDispatchResult('failed', 'provider', configuredProvider);
}