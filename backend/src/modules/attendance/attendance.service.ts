import pool from '../../config/db.ts';
import type {
  Attendance,
  MarkEntryDTO,
  MarkExitDTO,
  AttendanceWithStudent,
  TodayAttendanceSummary,
} from './attendance.types.ts';

async function getTodayDateString(): Promise<string> {
  const result = await pool.query<{ today: string }>('SELECT CURRENT_DATE::text AS today');
  return result.rows[0]?.today ?? new Date().toISOString().slice(0, 10);
}

async function verifyStudentAccess(
  studentId: number,
  branchId?: number,
): Promise<void> {
  const params: number[] = [studentId];
  let query = `
    SELECT id
    FROM students
    WHERE id = $1 AND is_active = true
  `;

  if (branchId !== undefined && branchId !== null) {
    params.push(branchId);
    query += ` AND branch_id = $${params.length}`;
  }

  const result = await pool.query(query, params);

  if (result.rows.length === 0) {
    throw new Error('Student not found or inactive');
  }
}

// Mark student entry (IN)
export async function markEntry(
  data: MarkEntryDTO,
  markedBy: number,
  branchId?: number,
): Promise<Attendance> {
  const today = await getTodayDateString();

  await verifyStudentAccess(data.student_id, branchId);

  const existing = await pool.query(
    `
      SELECT *
      FROM attendance
      WHERE student_id = $1 AND attendance_date = $2
    `,
    [data.student_id, today],
  );

  if (existing.rows.length > 0) {
    const record = existing.rows[0];

    if (record.entry_time && !record.exit_time) {
      throw new Error('Student already marked entry and has not exited yet');
    }

    if (record.exit_time) {
      throw new Error('Student already completed attendance for today');
    }
  }

  const result = await pool.query(
    `
      INSERT INTO attendance (
        student_id,
        attendance_date,
        entry_time,
        status,
        entry_marked_by,
        notes
      ) VALUES ($1, $2, NOW(), 'present', $3, $4)
      RETURNING *;
    `,
    [data.student_id, today, markedBy, data.notes || null],
  );

  return result.rows[0];
}

// Mark student exit (OUT)
export async function markExit(
  data: MarkExitDTO,
  markedBy: number,
  branchId?: number,
): Promise<Attendance> {
  const today = await getTodayDateString();

  await verifyStudentAccess(data.student_id, branchId);

  const params: Array<string | number> = [data.student_id, today];
  let findQuery = `
    SELECT a.*
    FROM attendance a
    JOIN students s ON a.student_id = s.id
    WHERE a.student_id = $1 AND a.attendance_date = $2
  `;

  if (branchId != null) {
    params.push(branchId);
    findQuery += ` AND s.branch_id = $${params.length}`;
  }

  const existing = await pool.query(findQuery, params);

  if (existing.rows.length === 0) {
    throw new Error('No entry found for today. Student must mark entry first.');
  }

  const record = existing.rows[0];

  if (!record.entry_time) {
    throw new Error('No entry time found. Student must mark entry first.');
  }

  if (record.exit_time) {
    throw new Error('Student already marked exit for today');
  }

  const entryTime = new Date(record.entry_time);
  const exitTime = new Date();
  const durationMinutes = Math.floor(
    (exitTime.getTime() - entryTime.getTime()) / (1000 * 60),
  );

  const result = await pool.query(
    `
      UPDATE attendance
      SET
        exit_time = NOW(),
        duration_minutes = $1,
        exit_marked_by = $2,
        notes = COALESCE($3, notes)
      WHERE id = $4
      RETURNING *;
    `,
    [durationMinutes, markedBy, data.notes || null, record.id],
  );

  return result.rows[0];
}

// Get today's attendance with student details
export async function getTodayAttendance(
  branchId?: number,
): Promise<TodayAttendanceSummary> {
  const todayString = await getTodayDateString();
  const params: Array<string | number> = [todayString];
  let query = `
    WITH attendance_live AS (
      SELECT
        a.id,
        a.student_id,
        s.name as student_name,
        s.student_id as student_code,
        s.branch_id,
        b.name as branch_name,
        s.study_plan,
        a.attendance_date,
        a.entry_time,
        a.exit_time,
        a.duration_minutes,
        CASE
          WHEN a.exit_time IS NOT NULL THEN COALESCE(a.duration_minutes, 0)
          WHEN a.entry_time IS NULL THEN 0
          ELSE GREATEST(
            FLOOR(EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - a.entry_time)) / 60),
            0
          )::int
        END as current_duration_minutes,
        CASE
          WHEN s.study_plan = '2_hours' THEN 120
          WHEN s.study_plan = '4_hours' THEN 240
          ELSE NULL
        END as allowed_minutes,
        a.status,
        a.notes
      FROM attendance a
      JOIN students s ON a.student_id = s.id
      JOIN branches b ON s.branch_id = b.id
      WHERE a.attendance_date = $1
    )
    SELECT
      id,
      student_id,
      student_name,
      student_code,
      branch_id,
      branch_name,
      study_plan,
      attendance_date,
      entry_time,
      exit_time,
      duration_minutes,
      current_duration_minutes,
      allowed_minutes,
      CASE
        WHEN allowed_minutes IS NULL THEN NULL
        ELSE GREATEST(allowed_minutes - current_duration_minutes, 0)
      END as remaining_minutes,
      CASE
        WHEN allowed_minutes IS NULL THEN 0
        ELSE GREATEST(current_duration_minutes - allowed_minutes, 0)
      END as overtime_minutes,
      CASE
        WHEN allowed_minutes IS NULL THEN false
        ELSE current_duration_minutes >= allowed_minutes
      END as is_overtime,
      CASE
        WHEN allowed_minutes IS NULL THEN false
        ELSE current_duration_minutes >= GREATEST(allowed_minutes - 15, 0)
          AND current_duration_minutes < allowed_minutes
      END as is_near_limit,
      status,
      notes
    FROM attendance_live
    WHERE 1 = 1
  `;

  if (branchId != null) {
    params.push(branchId);
    query += ` AND branch_id = $${params.length}`;
  }

  query += ' ORDER BY entry_time DESC;';

  const result = await pool.query(query, params);
  const allRecords: AttendanceWithStudent[] = result.rows.map((row) => ({
    ...row,
    current_duration_minutes: Number.parseInt(String(row.current_duration_minutes), 10),
    allowed_minutes:
      row.allowed_minutes == null ? null : Number.parseInt(String(row.allowed_minutes), 10),
    remaining_minutes:
      row.remaining_minutes == null ? null : Number.parseInt(String(row.remaining_minutes), 10),
    overtime_minutes: Number.parseInt(String(row.overtime_minutes), 10),
    is_overtime: Boolean(row.is_overtime),
    is_near_limit: Boolean(row.is_near_limit),
  }));

  return {
    date: new Date(todayString),
    total_entries: allRecords.length,
    currently_inside: allRecords.filter((record) => record.entry_time && !record.exit_time).length,
    total_exits: allRecords.filter((record) => record.exit_time).length,
    students_inside: allRecords.filter((record) => record.entry_time && !record.exit_time),
  };
}

// Get student's attendance history
export async function getStudentAttendanceHistory(
  studentId: number,
  startDate?: string,
  endDate?: string,
  limit: number = 30,
  branchId?: number,
): Promise<Attendance[]> {
  const params: Array<string | number> = [studentId];
  let query = `
    SELECT a.*
    FROM attendance a
    JOIN students s ON a.student_id = s.id
    WHERE a.student_id = $1
  `;

  if (branchId != null) {
    params.push(branchId);
    query += ` AND s.branch_id = $${params.length}`;
  }

  if (startDate) {
    params.push(startDate);
    query += ` AND a.attendance_date >= $${params.length}`;
  }

  if (endDate) {
    params.push(endDate);
    query += ` AND a.attendance_date <= $${params.length}`;
  }

  query += ` ORDER BY a.attendance_date DESC LIMIT $${params.length + 1}`;
  params.push(limit);

  const result = await pool.query(query, params);
  return result.rows;
}

// Get attendance statistics for a student
export async function getStudentAttendanceStats(
  studentId: number,
  month?: number,
  year?: number,
  branchId?: number,
) {
  const currentDate = new Date();
  const targetMonth = month || currentDate.getMonth() + 1;
  const targetYear = year || currentDate.getFullYear();
  const params: number[] = [studentId, targetMonth, targetYear];
  let query = `
    SELECT
      COUNT(*) as total_days,
      COUNT(CASE WHEN a.entry_time IS NOT NULL THEN 1 END) as days_present,
      COUNT(CASE WHEN a.exit_time IS NOT NULL THEN 1 END) as days_completed,
      COALESCE(SUM(a.duration_minutes), 0) as total_minutes,
      COALESCE(AVG(a.duration_minutes), 0) as avg_minutes_per_day
    FROM attendance a
    JOIN students s ON a.student_id = s.id
    WHERE a.student_id = $1
      AND EXTRACT(MONTH FROM a.attendance_date) = $2
      AND EXTRACT(YEAR FROM a.attendance_date) = $3
  `;

  if (branchId != null) {
    params.push(branchId);
    query += ` AND s.branch_id = $${params.length}`;
  }

  const result = await pool.query(query, params);
  const stats = result.rows[0];

  return {
    month: targetMonth,
    year: targetYear,
    total_days: Number.parseInt(stats.total_days, 10),
    days_present: Number.parseInt(stats.days_present, 10),
    days_completed: Number.parseInt(stats.days_completed, 10),
    total_hours: Math.floor(Number.parseInt(stats.total_minutes, 10) / 60),
    total_minutes: Number.parseInt(stats.total_minutes, 10),
    avg_minutes_per_day: Math.round(Number.parseFloat(stats.avg_minutes_per_day)),
  };
}
