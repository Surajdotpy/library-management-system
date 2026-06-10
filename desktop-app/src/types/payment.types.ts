export type PaymentVerificationSource =
  | 'legacy'
  | 'manual_entry'
  | 'superadmin_review'
  | 'gateway_webhook';
export type PaymentGatewayProvider = 'cashfree';
export type PaymentGatewayMode = 'mock' | 'sandbox' | 'production';

export interface Payment {
  id: number;
  student_id: number;
  student_name?: string;
  student_code?: string;
  student_email?: string | null;
  student_phone?: string;
  branch_id?: number;
  branch_name?: string;
  payment_date: string;
  coverage_start_date: string;
  coverage_end_date: string;
  amount: number;
  fee_month: number;
  fee_year: number;
  payment_method: 'upi';
  transaction_id: string | null;
  status: 'paid' | 'pending' | 'failed' | 'refunded';
  gateway_provider?: PaymentGatewayProvider | null;
  gateway_mode?: PaymentGatewayMode | null;
  gateway_session_id?: string | null;
  gateway_cf_order_id?: string | null;
  gateway_checkout_url?: string | null;
  gateway_upi_intent?: string | null;
  gateway_order_status?: string | null;
  gateway_expires_at?: string | null;
  receipt_number: string;
  verification_source: PaymentVerificationSource;
  verification_reference: string | null;
  verified_at: string | null;
  verified_by: number | null;
  collected_by?: number;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface RecordPaymentRequest {
  student_id: number;
  amount: number;
  fee_month?: number;
  fee_year?: number;
  payment_method?: 'upi';
  payment_date?: string;
  transaction_id?: string;
  notes?: string;
}

export interface ConfirmPaymentRequest {
  verification_reference?: string;
  confirmed_at?: string;
  amount?: number;
}

export interface CreateCashfreePaymentRequest {
  student_id: number;
}

export interface PaymentGatewaySession {
  provider: PaymentGatewayProvider;
  mode: PaymentGatewayMode;
  order_id: string;
  cf_order_id: string | null;
  payment_session_id: string;
  checkout_url: string | null;
  upi_intent: string | null;
  expires_at: string | null;
  order_status: string;
  note: string;
}

export interface CashfreePaymentRequestResult {
  payment: Payment;
  session: PaymentGatewaySession;
  public_payment_url: string;
  public_access_expires_at: string | null;
}

export interface PublicPaymentDetails {
  id: number;
  student_name: string;
  branch_name: string;
  amount: number;
  status: 'paid' | 'pending' | 'failed' | 'refunded';
  receipt_number: string;
  gateway_mode: PaymentGatewayMode | null;
  gateway_session_id: string | null;
  gateway_upi_intent: string | null;
  gateway_checkout_url: string | null;
  gateway_expires_at: string | null;
}

export type PaymentDueStatus = 'overdue' | 'due_today' | 'due_soon' | 'current';
export type PaymentCommunicationType = 'fee_reminder' | 'payment_receipt';
export type PaymentCommunicationChannel = 'sms' | 'whatsapp';
export type PaymentCommunicationRequestChannel = PaymentCommunicationChannel | 'both';
export type PaymentReminderStage = 'before_3_days' | 'due_today' | 'overdue';
export type PaymentCommunicationStatus = 'logged' | 'sent' | 'failed';
export type PaymentCommunicationDeliveryMode = 'log_only' | 'webhook' | 'provider';

export interface PendingPayment {
  student_id: number;
  student_name: string;
  student_code: string;
  student_email: string | null;
  student_phone: string;
  branch_id: number;
  branch_name: string;
  monthly_fee: number;
  pending_cycles: number;
  total_pending: number;
  last_payment_date: string | null;
  paid_through_date: string | null;
  next_due_date: string;
  days_until_due: number;
  due_status: PaymentDueStatus;
  renewal_amount: number;
  last_paid_fee_month: number | null;
  last_paid_fee_year: number | null;
  recommended_reminder_stage: PaymentReminderStage | null;
  last_reminder_at: string | null;
  last_reminder_channel: PaymentCommunicationChannel | null;
  last_reminder_stage: PaymentReminderStage | null;
}

export interface MonthlyRevenue {
  month: number;
  year: number;
  total_payments: number;
  total_amount: number;
  branch_wise?: BranchRevenue[];
}

export interface BranchRevenue {
  branch_id: number;
  branch_name: string;
  total_amount: number;
  payment_count: number;
}

export interface PaymentReceipt {
  receipt_number: string;
  student_name: string;
  student_code: string;
  student_email: string | null;
  student_phone: string;
  amount: number;
  payment_date: string;
  coverage_start_date: string;
  coverage_end_date: string;
  fee_month: number;
  fee_year: number;
  payment_method: string;
  transaction_id: string | null;
}

export interface PaymentCommunication {
  id: number;
  student_id: number;
  payment_id: number | null;
  branch_id: number;
  communication_type: PaymentCommunicationType;
  reminder_stage: PaymentReminderStage | null;
  channel: PaymentCommunicationChannel;
  delivery_status: PaymentCommunicationStatus;
  delivery_mode: PaymentCommunicationDeliveryMode;
  provider_name: string | null;
  external_message_id: string | null;
  recipient_phone: string;
  recipient_email: string | null;
  subject: string | null;
  message_body: string;
  receipt_snapshot: PaymentReceipt | null;
  sent_by: number | null;
  sent_at: string;
  created_at: string;
  updated_at: string;
  student_name: string;
  student_code: string;
  receipt_number: string | null;
}

export interface PaymentQueryOptions {
  month?: number;
  year?: number;
  search?: string;
  page?: number;
  limit?: number;
}

export interface PaymentCommunicationQueryOptions {
  student_id?: number;
  payment_id?: number;
  limit?: number;
}

export interface SendPaymentReminderRequest {
  student_id: number;
  channel?: PaymentCommunicationRequestChannel;
}

export interface SendPaymentReceiptRequest {
  channel?: PaymentCommunicationRequestChannel;
}

export interface PaymentReminderBatchResult {
  attempted: number;
  sent: number;
  skipped: number;
  communications: PaymentCommunication[];
}
