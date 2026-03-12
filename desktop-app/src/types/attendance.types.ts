/**
 * Attendance Types
 */

// Attendance record (from database)
export interface Attendance {
  id: number;
  student_id: number;
  student_name?: string;       // Optional: joined from students table
  student_code?: string;       // Optional: student_id code
  branch_id: number;
  entry_time: string;          // ISO datetime
  exit_time: string | null;    // ISO datetime or null if still inside
  date: string;                // YYYY-MM-DD
  duration_minutes: number | null;
  notes: string | null;
  created_at: string;
}

// Mark entry request
export interface MarkEntryRequest {
  student_id: number;
  notes?: string;
}

// Mark exit request
export interface MarkExitRequest {
  student_id: number;
  notes?: string;
}

// Today's attendance (who's inside now)
export interface TodayAttendance {
  id: number;
  student_id: number;
  student_name: string;
  student_code: string;
  entry_time: string;
  duration_minutes: number;    // How long they've been inside
  status: 'inside';
}

// Attendance statistics
export interface AttendanceStats {
  total_days: number;
  present_days: number;
  attendance_percentage: number;
  average_duration_minutes: number;
  total_hours_studied: number;
}

// Attendance summary (for reports)
export interface AttendanceSummary {
  date: string;
  total_entries: number;
  unique_students: number;
  average_duration: number;
}