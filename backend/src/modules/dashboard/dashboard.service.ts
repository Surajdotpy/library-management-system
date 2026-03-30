import pool from '../../config/db.ts';
import * as attendanceService from '../attendance/attendance.service.ts';
import * as paymentService from '../payments/payments.service.ts';
import type { PendingPayment } from '../payments/payments.types.ts';
import type {
  DashboardBranchInfo,
  DashboardBranchOverview,
  DashboardNotification,
  DashboardRecentPayment,
  DashboardStudentInside,
  DashboardSummary,
} from './dashboard.types.ts';

function formatDate(value: Date): string {
  return value.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatCurrency(amount: number): string {
  return `Rs ${amount.toLocaleString('en-IN')}`;
}

function createPaymentNotification(
  item: PendingPayment,
  type: DashboardNotification['type'],
  severity: DashboardNotification['severity'],
  title: string,
  description: string,
): DashboardNotification {
  return {
    id: `${type}-${item.student_id}`,
    type,
    severity,
    title,
    description,
    branch_name: item.branch_name,
    action_route: '/payments',
  };
}

function buildDashboardNotifications(
  paymentWatchlist: PendingPayment[],
  studentsInside: DashboardStudentInside[],
): DashboardNotification[] {
  const notifications: DashboardNotification[] = [];

  for (const item of paymentWatchlist.filter((entry) => entry.due_status === 'overdue').slice(0, 3)) {
    notifications.push(
      createPaymentNotification(
        item,
        'payment_overdue',
        'critical',
        `${item.student_name} is overdue`,
        `Fee was due on ${formatDate(item.next_due_date)}. Pending ${formatCurrency(item.total_pending)}.`,
      ),
    );
  }

  for (const item of paymentWatchlist.filter((entry) => entry.due_status === 'due_today').slice(0, 2)) {
    notifications.push(
      createPaymentNotification(
        item,
        'payment_due_today',
        'warning',
        `${item.student_name} is due today`,
        `Renewal is due today for ${formatCurrency(item.renewal_amount)}.`,
      ),
    );
  }

  for (const item of paymentWatchlist.filter((entry) => entry.due_status === 'due_soon').slice(0, 2)) {
    notifications.push(
      createPaymentNotification(
        item,
        'payment_due_soon',
        'info',
        `${item.student_name} is due soon`,
        `Next renewal is due on ${formatDate(item.next_due_date)}.`,
      ),
    );
  }

  for (const student of studentsInside.filter((entry) => entry.is_overtime).slice(0, 3)) {
    notifications.push({
      id: `attendance-overtime-${student.student_id}`,
      type: 'attendance_overtime',
      severity: 'critical',
      title: `${student.student_name} is over the study limit`,
      description: `Inside for ${student.current_duration_minutes} minutes, which is ${student.overtime_minutes} minutes over plan.`,
      branch_name: student.branch_name,
      action_route: '/attendance',
    });
  }

  for (const student of studentsInside.filter((entry) => entry.is_near_limit).slice(0, 2)) {
    notifications.push({
      id: `attendance-near-limit-${student.student_id}`,
      type: 'attendance_near_limit',
      severity: 'warning',
      title: `${student.student_name} is close to the study limit`,
      description: `Only ${student.remaining_minutes ?? 0} minutes remaining on the current plan.`,
      branch_name: student.branch_name,
      action_route: '/attendance',
    });
  }

  return notifications.slice(0, 8);
}

async function getBranchInfo(branchId: number): Promise<DashboardBranchInfo> {
  const result = await pool.query(
    `
      SELECT id, name, code, COALESCE(total_capacity, 0) AS total_capacity
      FROM branches
      WHERE id = $1 AND is_active = true
      LIMIT 1
    `,
    [branchId],
  );

  if (result.rows.length === 0) {
    throw new Error('Branch not found');
  }

  return result.rows[0];
}

async function getStudentStats(branchId?: number) {
  const params: number[] = [];
  let query = `
    SELECT
      COUNT(*)::int AS total_students,
      COUNT(*) FILTER (WHERE is_active = true)::int AS active_students,
      COUNT(*) FILTER (WHERE is_active = false)::int AS inactive_students
    FROM students
    WHERE 1 = 1
  `;

  if (branchId != null) {
    params.push(branchId);
    query += ` AND branch_id = $${params.length}`;
  }

  const result = await pool.query(query, params);
  return result.rows[0];
}

async function getTodayRevenue(branchId?: number): Promise<number> {
  const params: number[] = [];
  let query = `
    SELECT COALESCE(SUM(p.amount), 0) AS total
    FROM fee_payments p
    JOIN students s ON s.id = p.student_id
    WHERE DATE(p.payment_date) = CURRENT_DATE
      AND p.status = 'paid'
  `;

  if (branchId != null) {
    params.push(branchId);
    query += ` AND s.branch_id = $${params.length}`;
  }

  const result = await pool.query(query, params);
  return Number.parseFloat(result.rows[0]?.total ?? '0');
}

async function getRecentPayments(branchId?: number): Promise<DashboardRecentPayment[]> {
  const params: Array<number> = [];
  let query = `
    SELECT
      p.id AS payment_id,
      p.amount,
      p.payment_date,
      p.receipt_number,
      s.id AS student_id,
      s.name AS student_name,
      s.student_id AS student_code,
      s.branch_id,
      b.name AS branch_name
    FROM fee_payments p
    JOIN students s ON s.id = p.student_id
    JOIN branches b ON b.id = s.branch_id
    WHERE p.status = 'paid'
  `;

  if (branchId != null) {
    params.push(branchId);
    query += ` AND s.branch_id = $${params.length}`;
  }

  query += ' ORDER BY p.payment_date DESC LIMIT 5';
  const result = await pool.query<DashboardRecentPayment>(query, params);
  return result.rows;
}

async function getBranchOverview(): Promise<DashboardBranchOverview[]> {
  const result = await pool.query(
    `
      SELECT
        b.id AS branch_id,
        b.name AS branch_name,
        b.code AS branch_code,
        COALESCE(b.total_capacity, 0) AS total_capacity,
        COALESCE(st.total_students, 0)::int AS total_students,
        COALESCE(st.active_students, 0)::int AS active_students,
        COALESCE(att.currently_inside, 0)::int AS currently_inside,
        CASE
          WHEN COALESCE(b.total_capacity, 0) > 0
            THEN ROUND((COALESCE(att.currently_inside, 0)::numeric / b.total_capacity) * 100, 2)
          ELSE 0
        END AS occupancy_rate,
        COALESCE(pay.monthly_revenue, 0) AS monthly_revenue
      FROM branches b
      LEFT JOIN (
        SELECT
          branch_id,
          COUNT(*) AS total_students,
          COUNT(*) FILTER (WHERE is_active = true) AS active_students
        FROM students
        GROUP BY branch_id
      ) st ON st.branch_id = b.id
      LEFT JOIN (
        SELECT
          s.branch_id,
          COUNT(*) AS currently_inside
        FROM attendance a
        JOIN students s ON s.id = a.student_id
        WHERE a.attendance_date = CURRENT_DATE
          AND a.entry_time IS NOT NULL
          AND a.exit_time IS NULL
        GROUP BY s.branch_id
      ) att ON att.branch_id = b.id
      LEFT JOIN (
        SELECT
          s.branch_id,
          SUM(p.amount) AS monthly_revenue
        FROM fee_payments p
        JOIN students s ON s.id = p.student_id
        WHERE EXTRACT(MONTH FROM p.payment_date) = EXTRACT(MONTH FROM CURRENT_DATE)
          AND EXTRACT(YEAR FROM p.payment_date) = EXTRACT(YEAR FROM CURRENT_DATE)
          AND p.status = 'paid'
        GROUP BY s.branch_id
      ) pay ON pay.branch_id = b.id
      WHERE b.is_active = true
      ORDER BY b.id
    `,
  );

  return result.rows.map((row) => ({
    ...row,
    total_capacity: Number.parseInt(String(row.total_capacity), 10),
    total_students: Number.parseInt(String(row.total_students), 10),
    active_students: Number.parseInt(String(row.active_students), 10),
    currently_inside: Number.parseInt(String(row.currently_inside), 10),
    occupancy_rate: Number.parseFloat(String(row.occupancy_rate)),
    monthly_revenue: Number.parseFloat(String(row.monthly_revenue)),
  }));
}

export async function getDashboardSummary(branchId?: number): Promise<DashboardSummary> {
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1;
  const currentYear = currentDate.getFullYear();

  const branch = branchId != null ? await getBranchInfo(branchId) : null;
  const [
    studentStats,
    attendanceSummary,
    monthlyRevenue,
    paymentAlerts,
    todayRevenue,
    recentPayments,
    branchOverview,
  ] = await Promise.all([
    getStudentStats(branchId),
    attendanceService.getTodayAttendance(branchId),
    paymentService.getMonthlyRevenue(currentMonth, currentYear, branchId),
    paymentService.getPaymentAlertSummary(branchId),
    getTodayRevenue(branchId),
    getRecentPayments(branchId),
    branchId == null ? getBranchOverview() : Promise.resolve(undefined),
  ]);

  const totalCapacity = branchId == null
    ? (branchOverview ?? []).reduce((sum, item) => sum + item.total_capacity, 0)
    : branch?.total_capacity ?? 0;

  const occupancyRate = totalCapacity > 0
    ? Number.parseFloat(
        ((attendanceSummary.currently_inside / totalCapacity) * 100).toFixed(2),
      )
    : 0;

  const allStudentsInside: DashboardStudentInside[] = attendanceSummary.students_inside
    .map((student) => ({
      attendance_id: student.id,
      entry_time: student.entry_time ?? new Date(),
      student_id: student.student_id,
      student_name: student.student_name,
      student_code: student.student_code,
      branch_id: student.branch_id,
      branch_name: student.branch_name,
      study_plan: student.study_plan,
      current_duration_minutes: student.current_duration_minutes,
      allowed_minutes: student.allowed_minutes,
      remaining_minutes: student.remaining_minutes,
      overtime_minutes: student.overtime_minutes,
      is_overtime: student.is_overtime,
      is_near_limit: student.is_near_limit,
    }));

  const studentsInsidePreview: DashboardStudentInside[] = allStudentsInside
    .slice()
    .sort((left, right) => {
      if (left.is_overtime !== right.is_overtime) {
        return Number(right.is_overtime) - Number(left.is_overtime);
      }

      if (left.is_near_limit !== right.is_near_limit) {
        return Number(right.is_near_limit) - Number(left.is_near_limit);
      }

      return right.current_duration_minutes - left.current_duration_minutes;
    })
    .slice(0, 5);

  const notifications = buildDashboardNotifications(
    paymentAlerts.watchlist,
    allStudentsInside,
  );

  const summary: DashboardSummary = {
    scope: branchId == null ? 'global' : 'branch',
    generated_at: currentDate,
    branch,
    stats: {
      total_students: Number.parseInt(String(studentStats.total_students), 10),
      active_students: Number.parseInt(String(studentStats.active_students), 10),
      inactive_students: Number.parseInt(String(studentStats.inactive_students), 10),
      currently_inside: attendanceSummary.currently_inside,
      today_entries: attendanceSummary.total_entries,
      today_exits: attendanceSummary.total_exits,
      today_revenue: todayRevenue,
      monthly_revenue: monthlyRevenue.total_amount,
      pending_payments: paymentAlerts.attention_required_count,
      overdue_payments: paymentAlerts.overdue_count,
      due_today: paymentAlerts.due_today_count,
      due_soon: paymentAlerts.due_soon_count,
      total_capacity: totalCapacity,
      occupancy_rate: occupancyRate,
    },
    payment_alerts: {
      overdue_count: paymentAlerts.overdue_count,
      due_today_count: paymentAlerts.due_today_count,
      due_soon_count: paymentAlerts.due_soon_count,
      overdue_amount: paymentAlerts.overdue_amount,
      due_today_amount: paymentAlerts.due_today_amount,
      due_soon_amount: paymentAlerts.due_soon_amount,
    },
    notifications,
    recent_payments: recentPayments,
    students_inside: studentsInsidePreview,
  };

  if (branchId == null) {
    summary.branch_overview = branchOverview ?? [];
  }

  return summary;
}
