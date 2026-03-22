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
  branch_id: number;
  branch_name: string;
  study_plan: '2_hours' | '4_hours' | 'unlimited';
  attendance_date: Date;
  entry_time: Date | null;
  exit_time: Date | null;
  duration_minutes: number | null;
  current_duration_minutes: number;
  allowed_minutes: number | null;
  remaining_minutes: number | null;
  overtime_minutes: number;
  is_overtime: boolean;
  is_near_limit: boolean;
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
