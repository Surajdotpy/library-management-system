import pool from '../../config/db.ts';
import type {
  Attendance,
  MarkEntryDTO,
  MarkExitDTO,
  AttendanceWithStudent,
  TodayAttendanceSummary,
} from './attendance.types.ts';

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

  if (branchId != null) {
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
  const today = new Date().toISOString().slice(0, 10);

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
  const today = new Date().toISOString().slice(0, 10);

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
  const todayString = new Date().toISOString().substring(0, 10);
  const params: Array<string | number> = [todayString];
  let query = `
    SELECT
      a.id,
      a.student_id,
      s.name as student_name,
      s.student_id as student_code,
      a.attendance_date,
      a.entry_time,
      a.exit_time,
      a.duration_minutes,
      a.status,
      a.notes
    FROM attendance a
    JOIN students s ON a.student_id = s.id
    WHERE a.attendance_date = $1
  `;

  if (branchId != null) {
    params.push(branchId);
    query += ` AND s.branch_id = $${params.length}`;
  }

  query += ' ORDER BY a.entry_time DESC;';

  const result = await pool.query(query, params);
  const allRecords: AttendanceWithStudent[] = result.rows;

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
