import type { Attendance, MarkEntryDTO, MarkExitDTO, TodayAttendanceSummary } from './attendance.types.js';
export declare function markEntry(data: MarkEntryDTO, markedBy: number, branchId?: number): Promise<Attendance>;
export declare function markExit(data: MarkExitDTO, markedBy: number, branchId?: number): Promise<Attendance>;
export declare function getTodayAttendance(branchId?: number): Promise<TodayAttendanceSummary>;
export declare function getStudentAttendanceHistory(studentId: number, startDate?: string, endDate?: string, limit?: number, branchId?: number): Promise<Attendance[]>;
export declare function getStudentAttendanceStats(studentId: number, month?: number, year?: number, branchId?: number): Promise<{
    month: number;
    year: number;
    total_days: number;
    days_present: number;
    days_completed: number;
    total_hours: number;
    total_minutes: number;
    avg_minutes_per_day: number;
}>;
//# sourceMappingURL=attendance.service.d.ts.map