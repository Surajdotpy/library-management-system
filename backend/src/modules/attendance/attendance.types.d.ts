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
export interface MarkEntryDTO {
    student_id: number;
    notes?: string;
}
export interface MarkExitDTO {
    student_id: number;
    notes?: string;
}
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
export interface TodayAttendanceSummary {
    date: Date;
    total_entries: number;
    currently_inside: number;
    total_exits: number;
    students_inside: AttendanceWithStudent[];
}
export interface AttendanceHistoryQuery {
    student_id: number;
    start_date?: string;
    end_date?: string;
    limit?: number;
}
//# sourceMappingURL=attendance.types.d.ts.map