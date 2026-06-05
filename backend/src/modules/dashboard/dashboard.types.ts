import type { StudyPlan } from '../students/study-plans.ts';

export interface DashboardBranchInfo {
  id: number;
  name: string;
  code: string;
  total_capacity: number;
}

export interface DashboardStats {
  total_students: number;
  active_students: number;
  inactive_students: number;
  currently_inside: number;
  today_entries: number;
  today_exits: number;
  today_revenue: number;
  monthly_revenue: number;
  pending_payments: number;
  overdue_payments: number;
  due_today: number;
  due_soon: number;
  total_capacity: number;
  occupancy_rate: number;
}

export interface DashboardRecentPayment {
  payment_id: number;
  amount: number;
  payment_date: Date;
  status: 'paid' | 'pending' | 'failed' | 'refunded';
  activity_at: Date;
  submitted_at: Date;
  verified_at: Date | null;
  receipt_number: string;
  student_id: number;
  student_name: string;
  student_code: string;
  branch_id: number;
  branch_name: string;
}

export interface DashboardStudentInside {
  attendance_id: number;
  entry_time: Date;
  student_id: number;
  student_name: string;
  student_code: string;
  branch_id: number;
  branch_name: string;
  study_plan: StudyPlan;
  current_duration_minutes: number;
  allowed_minutes: number | null;
  remaining_minutes: number | null;
  overtime_minutes: number;
  is_overtime: boolean;
  is_near_limit: boolean;
}

export interface DashboardBranchOverview {
  branch_id: number;
  branch_name: string;
  branch_code: string;
  total_capacity: number;
  total_students: number;
  active_students: number;
  currently_inside: number;
  occupancy_rate: number;
  monthly_revenue: number;
}

export interface DashboardPaymentAlerts {
  overdue_count: number;
  due_today_count: number;
  due_soon_count: number;
  overdue_amount: number;
  due_today_amount: number;
  due_soon_amount: number;
}

export interface DashboardNotification {
  id: string;
  type: 'payment_overdue' | 'payment_due_today' | 'payment_due_soon' | 'attendance_overtime' | 'attendance_near_limit';
  severity: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  branch_name?: string;
  action_route: string;
}

export interface DashboardSummary {
  scope: 'global' | 'branch';
  generated_at: Date;
  branch: DashboardBranchInfo | null;
  stats: DashboardStats;
  payment_alerts: DashboardPaymentAlerts;
  notifications: DashboardNotification[];
  recent_payments: DashboardRecentPayment[];
  students_inside: DashboardStudentInside[];
  branch_overview?: DashboardBranchOverview[];
}
