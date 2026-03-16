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
    total_capacity: number;
    occupancy_rate: number;
}
export interface DashboardRecentPayment {
    payment_id: number;
    amount: number;
    payment_date: Date;
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
export interface DashboardSummary {
    scope: 'global' | 'branch';
    generated_at: Date;
    branch: DashboardBranchInfo | null;
    stats: DashboardStats;
    recent_payments: DashboardRecentPayment[];
    students_inside: DashboardStudentInside[];
    branch_overview?: DashboardBranchOverview[];
}
//# sourceMappingURL=dashboard.types.d.ts.map