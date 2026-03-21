import pool from '../../config/db.ts';
import * as attendanceService from '../attendance/attendance.service.ts';
import * as paymentService from '../payments/payments.service.ts';
import type {
  DashboardBranchInfo,
  DashboardBranchOverview,
  DashboardRecentPayment,
  DashboardStudentInside,
  DashboardSummary,
} from './dashboard.types.ts';

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
    WHERE 1 = 1
  `;

  if (branchId != null) {
    params.push(branchId);
    query += ` AND s.branch_id = $${params.length}`;
  }

  query += ' ORDER BY p.payment_date DESC LIMIT 5';
  const result = await pool.query(query, params);
  return result.rows;
}

async function getStudentsInside(branchId?: number): Promise<DashboardStudentInside[]> {
  const params: Array<number> = [];
  let query = `
    SELECT
      a.id AS attendance_id,
      a.entry_time,
      s.id AS student_id,
      s.name AS student_name,
      s.student_id AS student_code,
      s.branch_id,
      b.name AS branch_name
    FROM attendance a
    JOIN students s ON s.id = a.student_id
    JOIN branches b ON b.id = s.branch_id
    WHERE a.attendance_date = CURRENT_DATE
      AND a.entry_time IS NOT NULL
      AND a.exit_time IS NULL
  `;

  if (branchId != null) {
    params.push(branchId);
    query += ` AND s.branch_id = $${params.length}`;
  }

  query += ' ORDER BY a.entry_time DESC LIMIT 5';
  const result = await pool.query(query, params);
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
    pendingPayments,
    todayRevenue,
    recentPayments,
    studentsInside,
    branchOverview,
  ] = await Promise.all([
    getStudentStats(branchId),
    attendanceService.getTodayAttendance(branchId),
    paymentService.getMonthlyRevenue(currentMonth, currentYear, branchId),
    paymentService.getPendingPayments(branchId),
    getTodayRevenue(branchId),
    getRecentPayments(branchId),
    getStudentsInside(branchId),
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
      pending_payments: pendingPayments.length,
      total_capacity: totalCapacity,
      occupancy_rate: occupancyRate,
    },
    recent_payments: recentPayments,
    students_inside: studentsInside,
  };

  if (branchId == null) {
    summary.branch_overview = branchOverview ?? [];
  }

  return summary;
}
