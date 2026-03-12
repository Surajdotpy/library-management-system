/**
 * Payment Types
 */

// Payment record (from database)
export interface Payment {
  id: number;
  student_id: number;
  student_name?: string;        // Optional: joined from students table
  student_code?: string;        // Optional: student_id code
  payment_date: string;         // ISO datetime
  amount: number;
  fee_month: number;            // 1-12
  fee_year: number;             // 2026
  payment_method: 'upi';
  transaction_id: string | null;
  status: 'paid' | 'pending' | 'failed' | 'refunded';
  collected_by: number;         // Admin user id
  receipt_number: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// Record payment request
export interface RecordPaymentRequest {
  student_id: number;
  amount: number;
  fee_month: number;
  fee_year: number;
  payment_method?: 'upi';
  transaction_id?: string;
  notes?: string;
}

// Pending payment (student who hasn't paid)
export interface PendingPayment {
  student_id: number;
  student_name: string;
  student_code: string;
  student_email: string | null;
  student_phone: string;
  monthly_fee: number;
  pending_months: number;
  total_pending: number;
  last_payment_date: string | null;
}

// Monthly revenue summary
export interface MonthlyRevenue {
  month: number;
  year: number;
  total_payments: number;
  total_amount: number;
  branch_wise?: BranchRevenue[];
}

// Branch revenue
export interface BranchRevenue {
  branch_id: number;
  branch_name: string;
  total_amount: number;
  payment_count: number;
}

// Payment receipt data
export interface PaymentReceipt {
  receipt_number: string;
  student_name: string;
  student_code: string;
  student_email: string | null;
  student_phone: string;
  amount: number;
  payment_date: string;
  fee_month: number;
  fee_year: number;
  payment_method: string;
  transaction_id: string | null;
  collected_by_name: string;
}