import type { StudyPlan } from './student.types';

export interface Attendance {
  id: number;
  student_id: number;
  attendance_date: string;
  entry_time: string | null;
  exit_time: string | null;
  duration_minutes: number | null;
  status: 'present' | 'absent' | 'half_day' | 'on_leave';
  entry_marked_by: number | null;
  exit_marked_by: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface MarkEntryRequest {
  student_id: number;
  notes?: string;
}

export interface MarkExitRequest {
  student_id: number;
  notes?: string;
}

export interface TodayAttendanceStudent {
  id: number;
  student_id: number;
  student_name: string;
  student_code: string;
  branch_id: number;
  branch_name: string;
  study_plan: StudyPlan;
  attendance_date: string;
  entry_time: string | null;
  exit_time: string | null;
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

export interface TodayAttendanceSummary {
  date: string;
  total_entries: number;
  currently_inside: number;
  total_exits: number;
  students_inside: TodayAttendanceStudent[];
}

export interface AttendanceStats {
  month: number;
  year: number;
  total_days: number;
  days_present: number;
  days_completed: number;
  total_hours: number;
  total_minutes: number;
  avg_minutes_per_day: number;
}
