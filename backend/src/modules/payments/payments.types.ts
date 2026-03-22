// Payment record from database
export interface Payment {
  id: number;
  student_id: number;
  payment_date: Date;
  coverage_start_date: Date;
  coverage_end_date: Date;
  amount: number;
  fee_month: number;
  fee_year: number;
  payment_method: 'upi';  // Only UPI for now
  transaction_id: string | null;
  status: 'paid' | 'pending' | 'failed' | 'refunded';
  collected_by: number;
  receipt_number: string;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
}

// Record payment request
export interface RecordPaymentDTO {
  student_id: number;
  amount: number;
  fee_month?: number;
  fee_year?: number;
  payment_method?: 'upi';  // Optional, defaults to 'upi'
  transaction_id?: string;
  notes?: string;
}

// Payment with student details
export interface PaymentWithStudent {
  id: number;
  payment_date: Date;
  coverage_start_date: Date;
  coverage_end_date: Date;
  amount: number;
  fee_month: number;
  fee_year: number;
  payment_method: string;
  transaction_id: string | null;
  status: string;
  receipt_number: string;
  student_id: number;
  student_name: string;
  student_code: string;
  student_email: string | null;
  student_phone: string;
  branch_id?: number;
  branch_name?: string;
}

export type PaymentCommunicationType = 'fee_reminder' | 'payment_receipt';
export type PaymentCommunicationChannel = 'sms' | 'whatsapp';
export type PaymentCommunicationRequestChannel = PaymentCommunicationChannel | 'both';
export type PaymentReminderStage = 'before_3_days' | 'due_today' | 'overdue';
export type PaymentCommunicationStatus = 'logged' | 'sent' | 'failed';
export type PaymentCommunicationDeliveryMode = 'log_only' | 'webhook' | 'provider';

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
  receipt_snapshot: ReceiptData | null;
  sent_by: number | null;
  sent_at: Date;
  created_at: Date;
  updated_at: Date;
  student_name: string;
  student_code: string;
  receipt_number: string | null;
}

// Pending payment info
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
  last_payment_date: Date | null;
  paid_through_date: Date | null;
  next_due_date: Date;
  days_until_due: number;
  due_status: 'overdue' | 'due_today' | 'due_soon' | 'current';
  renewal_amount: number;
  last_paid_fee_month: number | null;
  last_paid_fee_year: number | null;
  recommended_reminder_stage: PaymentReminderStage | null;
  last_reminder_at: Date | null;
  last_reminder_channel: PaymentCommunicationChannel | null;
  last_reminder_stage: PaymentReminderStage | null;
}

export interface PaymentAlertSummary {
  overdue_count: number;
  due_today_count: number;
  due_soon_count: number;
  current_count: number;
  overdue_amount: number;
  due_today_amount: number;
  due_soon_amount: number;
  attention_required_count: number;
  attention_required_amount: number;
  watchlist: PendingPayment[];
}

// Monthly revenue report
export interface MonthlyRevenue {
  month: number;
  year: number;
  total_payments: number;
  total_amount: number;
  branch_wise?: {
    branch_id: number;
    branch_name: string;
    total_amount: number;
    payment_count: number;
  }[];
}

// QR Code payment request (Phase 2 - UPI QR)
export interface QRPaymentRequest {
  student_id: number;
  amount: number;
  fee_month: number;
  fee_year: number;
}

// QR Code response (Phase 2 - UPI QR)
export interface QRPaymentResponse {
  qr_code_url: string;
  payment_id: string;
  upi_string: string;
  expires_at: Date;
}

// Receipt data for WhatsApp/Email (Phase 3)
export interface ReceiptData {
  receipt_number: string;
  student_name: string;
  student_code: string;
  student_email: string | null;
  student_phone: string;
  amount: number;
  payment_date: Date;
  coverage_start_date: Date;
  coverage_end_date: Date;
  fee_month: number;
  fee_year: number;
  payment_method: string;
  transaction_id: string | null;
}

export interface SendPaymentReminderDTO {
  student_id: number;
  channel?: PaymentCommunicationRequestChannel;
}

export interface SendPaymentReceiptDTO {
  channel?: PaymentCommunicationRequestChannel;
}

export interface PaymentCommunicationQueryOptions {
  student_id?: number;
  payment_id?: number;
  limit?: number;
}

export interface PaymentReminderBatchResult {
  attempted: number;
  sent: number;
  skipped: number;
  communications: PaymentCommunication[];
}
