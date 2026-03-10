import pool from '../../config/db.js';
import type {
  Attendance,
  MarkEntryDTO,
  MarkExitDTO,
  AttendanceWithStudent,
  TodayAttendanceSummary
} from './attendance.types.js';

// Mark student entry (IN)
export async function markEntry(data: MarkEntryDTO, markedBy: number): Promise<Attendance> {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  
  // Check if student already has entry today
  const checkQuery = `
    SELECT * FROM attendance 
    WHERE student_id = $1 AND attendance_date = $2
  `;
  
  const existing = await pool.query(checkQuery, [data.student_id, today]);
  
  if (existing.rows.length > 0) {
    const record = existing.rows[0];
    
    // If already entered and not exited, throw error
    if (record.entry_time && !record.exit_time) {
      throw new Error('Student already marked entry and has not exited yet');
    }
    
    // If already exited (came back again), throw error
    if (record.exit_time) {
      throw new Error('Student already completed attendance for today');
    }
  }
  
  // Insert new entry
  const insertQuery = `
    INSERT INTO attendance (
      student_id,
      attendance_date,
      entry_time,
      status,
      entry_marked_by,
      notes
    ) VALUES ($1, $2, NOW(), 'present', $3, $4)
    RETURNING *;
  `;
  
  const result = await pool.query(insertQuery, [
    data.student_id,
    today,
    markedBy,
    data.notes || null
  ]);
  
  return result.rows[0];
}

// Mark student exit (OUT)
export async function markExit(data: MarkExitDTO, markedBy: number): Promise<Attendance> {
  const today = new Date().toISOString().split('T')[0];
  
  // Find today's entry
  const findQuery = `
    SELECT * FROM attendance 
    WHERE student_id = $1 AND attendance_date = $2
  `;
  
  const existing = await pool.query(findQuery, [data.student_id, today]);
  
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
  
  // Calculate duration in minutes
  const entryTime = new Date(record.entry_time);
  const exitTime = new Date();
  const durationMinutes = Math.floor((exitTime.getTime() - entryTime.getTime()) / (1000 * 60));
  
  // Update with exit time and duration
  const updateQuery = `
    UPDATE attendance 
    SET 
      exit_time = NOW(),
      duration_minutes = $1,
      exit_marked_by = $2,
      notes = COALESCE($3, notes)
    WHERE id = $4
    RETURNING *;
  `;
  
  const result = await pool.query(updateQuery, [
    durationMinutes,
    markedBy,
    data.notes || null,
    record.id
  ]);
  
  return result.rows[0];
}

// Get today's attendance with student details
export async function getTodayAttendance(): Promise<TodayAttendanceSummary> {
  const todayISO = new Date().toISOString();
  const todayString = todayISO.substring(0, 10);  // YYYY-MM-DD
  const today = new Date(todayString);
  
  const query = `
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
    ORDER BY a.entry_time DESC;
  `;
  
  const result = await pool.query(query, [todayString]);
  
  const allRecords: AttendanceWithStudent[] = result.rows;
  
  // Calculate summary
  const totalEntries = allRecords.length;
  const currentlyInside = allRecords.filter(r => r.entry_time && !r.exit_time).length;
  const totalExits = allRecords.filter(r => r.exit_time).length;
  const studentsInside = allRecords.filter(r => r.entry_time && !r.exit_time);
  
  return {
    date: today,
    total_entries: totalEntries,
    currently_inside: currentlyInside,
    total_exits: totalExits,
    students_inside: studentsInside
  };
}

// Get student's attendance history
export async function getStudentAttendanceHistory(
  studentId: number,
  startDate?: string,
  endDate?: string,
  limit: number = 30
): Promise<Attendance[]> {
  let query = `
    SELECT * FROM attendance 
    WHERE student_id = $1
  `;
  
  const params: any[] = [studentId];
  
  if (startDate) {
    params.push(startDate);
    query += ` AND attendance_date >= $${params.length}`;
  }
  
  if (endDate) {
    params.push(endDate);
    query += ` AND attendance_date <= $${params.length}`;
  }
  
  query += ` ORDER BY attendance_date DESC LIMIT $${params.length + 1}`;
  params.push(limit);
  
  const result = await pool.query(query, params);
  
  return result.rows;
}

// Get attendance statistics for a student
export async function getStudentAttendanceStats(studentId: number, month?: number, year?: number) {
  const currentDate = new Date();
  const targetMonth = month || currentDate.getMonth() + 1;
  const targetYear = year || currentDate.getFullYear();
  
  const query = `
    SELECT 
      COUNT(*) as total_days,
      COUNT(CASE WHEN entry_time IS NOT NULL THEN 1 END) as days_present,
      COUNT(CASE WHEN exit_time IS NOT NULL THEN 1 END) as days_completed,
      COALESCE(SUM(duration_minutes), 0) as total_minutes,
      COALESCE(AVG(duration_minutes), 0) as avg_minutes_per_day
    FROM attendance
    WHERE student_id = $1
      AND EXTRACT(MONTH FROM attendance_date) = $2
      AND EXTRACT(YEAR FROM attendance_date) = $3;
  `;
  
  const result = await pool.query(query, [studentId, targetMonth, targetYear]);
  
  const stats = result.rows[0];
  
  return {
    month: targetMonth,
    year: targetYear,
    total_days: parseInt(stats.total_days),
    days_present: parseInt(stats.days_present),
    days_completed: parseInt(stats.days_completed),
    total_hours: Math.floor(stats.total_minutes / 60),
    total_minutes: parseInt(stats.total_minutes),
    avg_minutes_per_day: Math.round(stats.avg_minutes_per_day)
  };
}