import pool from '../../config/db.ts';

function roundToTwoDecimals(value: number): number {
  return Number(value.toFixed(2));
}

function calculateGrowthRate(currentCount: number, previousCount: number): number {
  if (previousCount === 0) {
    return currentCount === 0 ? 0 : 100;
  }

  return roundToTwoDecimals(((currentCount - previousCount) / previousCount) * 100);
}

export async function getOverviewStats() {
  const client = await pool.connect();
  
  try {
    // Total revenue this month
    const revenueResult = await client.query(
      `SELECT COALESCE(SUM(amount), 0) as total_revenue
       FROM fee_payments
       WHERE payment_date >= DATE_TRUNC('month', CURRENT_DATE)
         AND payment_date < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'
         AND status = 'paid'`
    );

    // Total active students
    const studentsResult = await client.query(
      `SELECT COUNT(*) as total_students FROM students WHERE is_active = true`
    );

    // Average occupancy rate (students currently inside / total capacity)
    const occupancyResult = await client.query(
      `SELECT
        COALESCE(capacity.total_capacity, 0) AS total_capacity,
        COALESCE(attendance.currently_inside, 0) AS currently_inside
       FROM (
         SELECT COALESCE(SUM(total_capacity), 0) AS total_capacity
         FROM branches
         WHERE is_active = true
       ) capacity
       CROSS JOIN (
         SELECT COUNT(DISTINCT a.student_id) AS currently_inside
         FROM attendance a
         JOIN students s ON s.id = a.student_id
         JOIN branches b ON b.id = s.branch_id
         WHERE a.attendance_date = CURRENT_DATE
           AND a.entry_time IS NOT NULL
           AND a.exit_time IS NULL
           AND s.is_active = true
           AND b.is_active = true
       ) attendance`
    );

    // Growth rate (compare this month vs last month students)
    const growthCountsResult = await client.query(
      `SELECT
         COUNT(*) FILTER (
           WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE)
             AND created_at < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'
         ) AS current_month_count,
         COUNT(*) FILTER (
           WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '1 month'
             AND created_at < DATE_TRUNC('month', CURRENT_DATE)
         ) AS previous_month_count
       FROM students`
    );

    const currentMonthCount = Number.parseInt(
      growthCountsResult.rows[0]?.current_month_count ?? '0',
      10,
    );
    const previousMonthCount = Number.parseInt(
      growthCountsResult.rows[0]?.previous_month_count ?? '0',
      10,
    );
    const totalCapacity = Number.parseInt(occupancyResult.rows[0]?.total_capacity ?? '0', 10);
    const currentlyInside = Number.parseInt(
      occupancyResult.rows[0]?.currently_inside ?? '0',
      10,
    );
    const avgOccupancy =
      totalCapacity > 0
        ? roundToTwoDecimals((currentlyInside / totalCapacity) * 100)
        : 0;

    return {
      total_revenue: parseFloat(revenueResult.rows[0].total_revenue),
      total_students: parseInt(studentsResult.rows[0].total_students),
      avg_occupancy: avgOccupancy,
      growth_rate: calculateGrowthRate(currentMonthCount, previousMonthCount),
    };
  } finally {
    client.release();
  }
}

export async function getRevenueTrend(months: number = 6) {
  const client = await pool.connect();
  
  try {
    const result = await client.query(
      `WITH month_series AS (
         SELECT generate_series(
           DATE_TRUNC('month', CURRENT_DATE) - (($1::int - 1) * INTERVAL '1 month'),
           DATE_TRUNC('month', CURRENT_DATE),
           INTERVAL '1 month'
         ) AS month_start
       )
       SELECT
         TO_CHAR(ms.month_start, 'Mon YYYY') AS month_label,
         COALESCE(SUM(fp.amount), 0) AS revenue
       FROM month_series ms
       LEFT JOIN fee_payments fp
         ON DATE_TRUNC('month', fp.payment_date) = ms.month_start
        AND fp.status = 'paid'
       GROUP BY ms.month_start
       ORDER BY ms.month_start`,
      [months],
    );

    return result.rows.map((row: any) => ({
      month: row.month_label,
      revenue: parseFloat(row.revenue),
    }));
  } finally {
    client.release();
  }
}

export async function getStudentGrowth(months: number = 6) {
  const client = await pool.connect();
  
  try {
    const result = await client.query(
      `WITH month_series AS (
         SELECT generate_series(
           DATE_TRUNC('month', CURRENT_DATE) - (($1::int - 1) * INTERVAL '1 month'),
           DATE_TRUNC('month', CURRENT_DATE),
           INTERVAL '1 month'
         ) AS month_start
       )
       SELECT
         TO_CHAR(ms.month_start, 'Mon YYYY') AS month_label,
         COUNT(s.id) AS students
       FROM month_series ms
       LEFT JOIN students s
         ON DATE_TRUNC('month', s.created_at) = ms.month_start
       GROUP BY ms.month_start
       ORDER BY ms.month_start`,
      [months],
    );

    return result.rows.map((row: any) => ({
      month: row.month_label,
      students: parseInt(row.students),
    }));
  } finally {
    client.release();
  }
}

export async function getBranchComparison() {
  const client = await pool.connect();
  
  try {
    const result = await client.query(
      `SELECT
         b.id,
         b.name,
         b.code,
         COALESCE(student_stats.total_students, 0)::int AS total_students,
         COALESCE(student_stats.active_students, 0)::int AS active_students,
         COALESCE(revenue_stats.monthly_revenue, 0) AS monthly_revenue,
         COALESCE(b.total_capacity, 0)::int AS total_capacity,
         COALESCE(attendance_stats.currently_inside, 0)::int AS currently_inside
       FROM branches b
       LEFT JOIN (
         SELECT
           branch_id,
           COUNT(*) AS total_students,
           COUNT(*) FILTER (WHERE is_active = true) AS active_students
         FROM students
         GROUP BY branch_id
       ) student_stats
         ON student_stats.branch_id = b.id
       LEFT JOIN (
         SELECT
           s.branch_id,
           COALESCE(SUM(p.amount), 0) AS monthly_revenue
         FROM fee_payments p
         JOIN students s ON s.id = p.student_id
         WHERE p.payment_date >= DATE_TRUNC('month', CURRENT_DATE)
           AND p.payment_date < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'
           AND p.status = 'paid'
         GROUP BY s.branch_id
       ) revenue_stats
         ON revenue_stats.branch_id = b.id
       LEFT JOIN (
         SELECT
           s.branch_id,
           COUNT(DISTINCT a.student_id) AS currently_inside
         FROM attendance a
         JOIN students s ON s.id = a.student_id
         WHERE a.attendance_date = CURRENT_DATE
           AND a.entry_time IS NOT NULL
           AND a.exit_time IS NULL
         GROUP BY s.branch_id
       ) attendance_stats
         ON attendance_stats.branch_id = b.id
       WHERE b.is_active = true
       ORDER BY monthly_revenue DESC, b.name ASC`
    );

    return result.rows.map((row: any) => ({
      branch_id: row.id,
      branch_name: row.name,
      branch_code: row.code,
      total_students: parseInt(row.total_students) || 0,
      active_students: parseInt(row.active_students) || 0,
      monthly_revenue: parseFloat(row.monthly_revenue) || 0,
      total_capacity: row.total_capacity || 0,
      currently_inside: parseInt(row.currently_inside) || 0,
      occupancy_rate: row.total_capacity > 0 
        ? ((parseInt(row.currently_inside) / row.total_capacity) * 100).toFixed(2)
        : '0',
    }));
  } finally {
    client.release();
  }
}

export async function getAttendancePatterns(days: number = 30) {
  const client = await pool.connect();
  
  try {
    const result = await client.query(
      `SELECT 
        a.attendance_date as date,
        TO_CHAR(a.attendance_date, 'DD Mon') as date_label,
        COUNT(DISTINCT a.student_id) as unique_students,
        COUNT(*) FILTER (WHERE a.entry_time IS NOT NULL) as total_entries
       FROM attendance a
       WHERE a.attendance_date >= CURRENT_DATE - ($1::int * INTERVAL '1 day')
       GROUP BY a.attendance_date, TO_CHAR(a.attendance_date, 'DD Mon')
       ORDER BY a.attendance_date`,
      [days],
    );

    return result.rows.map((row: any) => ({
      date: row.date_label,
      unique_students: parseInt(row.unique_students),
      total_entries: parseInt(row.total_entries),
    }));
  } finally {
    client.release();
  }
}
