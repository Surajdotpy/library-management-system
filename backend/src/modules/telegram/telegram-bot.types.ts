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

export interface BranchInfo {
  branch_name: string;
  active_students: number;
  total_seats: number;
  occupied_seats: number;
  monthly_revenue: number;
}

export interface TodayInfo {
  attendance_count: number;
  new_students: number;
  revenue_collected: number;
  pending_payments: number;
}

export interface StudentSearchResult {
  name: string;
  student_id: string;
  is_active: boolean;
  study_plan: string | null;
  monthly_fee: number;
  joining_date: string;
  branch_name: string;
  seat_number: string | null;
  floor_name: string | null;
}

export interface RevenueInfo {
  today: number;
  this_week: number;
  this_month: number;
  this_year: number;
}

export interface NotificationItem {
  type: string;
  severity: string;
  title: string;
  description: string;
  branch_name: string | null;
  created_at: string;
}

export interface BookingInfo {
  student_name: string;
  student_id: string;
  seat_number: string;
  branch_name: string;
  status: string;
  start_date: string;
  end_date: string;
}

export interface DefaulterInfo {
  name: string;
  student_id: string;
  branch_name: string;
  overdue_count: number;
  total_due: number;
}
