// Payment record from database
export interface Payment {
  id: number;
  student_id: number;
  payment_date: Date;
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
  fee_month: number;
  fee_year: number;
  payment_method?: 'upi';  // Optional, defaults to 'upi'
  transaction_id?: string;
  notes?: string;
}

// Payment with student details
export interface PaymentWithStudent {
  id: number;
  payment_date: Date;
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
}

// Pending payment info
export interface PendingPayment {
  student_id: number;
  student_name: string;
  student_code: string;
  student_email: string | null;
  student_phone: string;
  monthly_fee: number;
  pending_months: number;
  total_pending: number;
  last_payment_date: Date | null;
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
  student_email: string | null;
  student_phone: string;
  amount: number;
  payment_date: Date;
  fee_month: number;
  fee_year: number;
  payment_method: string;
  transaction_id: string | null;
}