export interface TelegramSummary {
  total_students: number;
  active_students: number;
  paid_this_month: number;
  pending_payments: number;
  overdue_count: number;
  overdue_amount: number;
  today_revenue: number;
  monthly_revenue: number;
  seats_total: number;
  seats_occupied: number;
  seats_available: number;
  seats_maintenance: number;
  today_attendance: number;
  alerts_count: number;
}

export interface PendingPaymentInfo {
  student_name: string;
  student_code: string;
  amount: number;
  due_date: string;
  branch_name: string;
}

export interface SeatInfo {
  seat_number: string;
  floor_name: string | null;
  status: string;
  student_name: string | null;
  branch_name: string;
}

export interface AlertInfo {
  type: string;
  title: string;
  description: string;
}
