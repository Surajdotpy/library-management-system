export interface Payment {
  id: number;
  student_id: number;
  student_name?: string;
  student_code?: string;
  student_email?: string | null;
  student_phone?: string;
  payment_date: string;
  coverage_start_date: string;
  coverage_end_date: string;
  amount: number;
  fee_month: number;
  fee_year: number;
  payment_method: 'upi';
  transaction_id: string | null;
  status: 'paid' | 'pending' | 'failed' | 'refunded';
  receipt_number: string;
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
  transaction_id?: string;
  notes?: string;
}

export type PaymentDueStatus = 'overdue' | 'due_today' | 'due_soon' | 'current';

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

export interface PaymentQueryOptions {
  month?: number;
  year?: number;
  limit?: number;
}
