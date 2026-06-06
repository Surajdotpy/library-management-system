export interface FeeDashboard {
  today_collected: number;
  today_count: number;
  month_collected: number;
  month_count: number;
  pending_count: number;
  pending_amount: number;
  overdue_count: number;
  overdue_amount: number;
}

export interface StudentFeeStatus {
  student_id: number;
  student_code: string;
  name: string;
  branch_name: string;
  study_plan: string;
  monthly_fee: number;
  status: 'paid' | 'pending' | 'overdue';
  paid_amount: number;
  payment_date: string | null;
  coverage_start: string | null;
  coverage_end: string | null;
}

export interface OverdueStudent {
  student_id: number;
  student_code: string;
  name: string;
  branch_name: string;
  phone: string;
  monthly_fee: number;
  overdue_months: number;
  total_due: number;
  last_paid_date: string | null;
}

export interface DueGenerationResult {
  generated: number;
  skipped: number;
  errors: string[];
}

export interface FeePaymentRecord {
  id: number;
  student_id: number;
  amount: number;
  payment_date: string;
  fee_month: number;
  fee_year: number;
  status: string;
  payment_method: string;
  transaction_id: string | null;
  receipt_number: string | null;
  student_name: string;
  student_code: string;
  branch_name: string;
}

export interface FeePaymentDetail {
  id: number;
  student_id: number;
  amount: number;
  payment_date: string;
  fee_month: number;
  fee_year: number;
  status: string;
  payment_method: string;
  transaction_id: string | null;
  receipt_number: string | null;
  coverage_start_date: string;
  coverage_end_date: string;
  notes: string | null;
  collected_by: string | null;
  verification_source: string;
  created_at: string;
}
