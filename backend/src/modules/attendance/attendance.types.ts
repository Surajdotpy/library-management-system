// Attendance record from database
export interface Attendance {
  id: number;
  student_id: number;
  attendance_date: Date;
  entry_time: Date | null;
  exit_time: Date | null;
  duration_minutes: number | null;
  status: 'present' | 'absent' | 'half_day' | 'on_leave';
  entry_marked_by: number | null;
  exit_marked_by: number | null;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
}

// Mark entry request
export interface MarkEntryDTO {
  student_id: number;
  notes?: string;
}

// Mark exit request
export interface MarkExitDTO {
  student_id: number;
  notes?: string;
}

// Attendance with student details (for display)
export interface AttendanceWithStudent {
  id: number;
  student_id: number;
  student_name: string;
  student_code: string;
  attendance_date: Date;
  entry_time: Date | null;
  exit_time: Date | null;
  duration_minutes: number | null;
  status: string;
  notes: string | null;
}

// Today's attendance summary
export interface TodayAttendanceSummary {
  date: Date;
  total_entries: number;
  currently_inside: number;
  total_exits: number;
  students_inside: AttendanceWithStudent[];
}

// Student attendance history query params
export interface AttendanceHistoryQuery {
  student_id: number;
  start_date?: string;
  end_date?: string;
  limit?: number;
}