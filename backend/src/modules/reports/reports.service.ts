import pool from '../../config/db.js';

export async function getOverviewStats() {
  const client = await pool.connect();
  
  try {
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    const lastMonth = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 7);

    // Total revenue this month
    const revenueResult = await client.query(
      `SELECT COALESCE(SUM(amount), 0) as total_revenue
       FROM fee_payments
       WHERE TO_CHAR(payment_date, 'YYYY-MM') = $1
       AND status = 'completed'`,
      [currentMonth]
    );

    // Total active students
    const studentsResult = await client.query(
      `SELECT COUNT(*) as total_students FROM students WHERE is_active = true`
    );

    // Average occupancy rate (students currently inside / total capacity)
    const occupancyResult = await client.query(
      `SELECT 
        ROUND(
          CASE 
            WHEN SUM(b.total_capacity) > 0 
            THEN (COUNT(DISTINCT a.student_id)::numeric / SUM(b.total_capacity)::numeric) * 100
            ELSE 0 
          END, 
          2
        ) as avg_occupancy
       FROM branches b
       LEFT JOIN students s ON s.branch_id = b.id AND s.is_active = true
       LEFT JOIN attendance a ON a.student_id = s.id 
         AND a.attendance_date = CURRENT_DATE 
         AND a.entry_time IS NOT NULL 
         AND a.exit_time IS NULL
       WHERE b.is_active = true`
    );

    // Growth rate (compare this month vs last month students)
    const thisMonthStudents = await client.query(
      `SELECT COUNT(*) as count FROM students 
       WHERE TO_CHAR(created_at, 'YYYY-MM') = $1`,
      [currentMonth]
    );

    const lastMonthStudents = await client.query(
      `SELECT COUNT(*) as count FROM students 
       WHERE TO_CHAR(created_at, 'YYYY-MM') = $1`,
      [lastMonth]
    );

    const thisCount = parseInt(thisMonthStudents.rows[0].count);
    const lastCount = parseInt(lastMonthStudents.rows[0].count) || 1;
    const growthRate = ((thisCount - lastCount) / lastCount * 100).toFixed(2);

    return {
      total_revenue: parseFloat(revenueResult.rows[0].total_revenue),
      total_students: parseInt(studentsResult.rows[0].total_students),
      avg_occupancy: parseFloat(occupancyResult.rows[0].avg_occupancy) || 0,
      growth_rate: parseFloat(growthRate),
    };
  } finally {
    client.release();
  }
}

export async function getRevenueTrend(months: number = 6) {
  const client = await pool.connect();
  
  try {
    const result = await client.query(
      `SELECT 
        TO_CHAR(payment_date, 'YYYY-MM') as month,
        TO_CHAR(payment_date, 'Mon YYYY') as month_label,
        COALESCE(SUM(amount), 0) as revenue
       FROM fee_payments
       WHERE payment_date >= CURRENT_DATE - INTERVAL '${months} months'
       AND status = 'completed'
       GROUP BY TO_CHAR(payment_date, 'YYYY-MM'), TO_CHAR(payment_date, 'Mon YYYY')
       ORDER BY month`
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
      `SELECT 
        TO_CHAR(created_at, 'YYYY-MM') as month,
        TO_CHAR(created_at, 'Mon YYYY') as month_label,
        COUNT(*) as students
       FROM students
       WHERE created_at >= CURRENT_DATE - INTERVAL '${months} months'
       GROUP BY TO_CHAR(created_at, 'YYYY-MM'), TO_CHAR(created_at, 'Mon YYYY')
       ORDER BY month`
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
    const currentMonth = new Date().toISOString().slice(0, 7);

    const result = await client.query(
      `SELECT 
        b.id,
        b.name,
        b.code,
        COUNT(DISTINCT s.id) as total_students,
        COUNT(DISTINCT s.id) FILTER (WHERE s.is_active = true) as active_students,
        COALESCE(SUM(p.amount) FILTER (WHERE TO_CHAR(p.payment_date, 'YYYY-MM') = $1 AND p.status = 'completed'), 0) as monthly_revenue,
        b.total_capacity,
        COUNT(DISTINCT a.student_id) FILTER (
          WHERE a.attendance_date = CURRENT_DATE 
          AND a.entry_time IS NOT NULL 
          AND a.exit_time IS NULL
        ) as currently_inside
       FROM branches b
       LEFT JOIN students s ON s.branch_id = b.id
       LEFT JOIN fee_payments p ON p.student_id = s.id
       LEFT JOIN attendance a ON a.student_id = s.id
       WHERE b.is_active = true
       GROUP BY b.id, b.name, b.code, b.total_capacity
       ORDER BY monthly_revenue DESC`,
      [currentMonth]
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
       WHERE a.attendance_date >= CURRENT_DATE - INTERVAL '${days} days'
       GROUP BY a.attendance_date, TO_CHAR(a.attendance_date, 'DD Mon')
       ORDER BY a.attendance_date`
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