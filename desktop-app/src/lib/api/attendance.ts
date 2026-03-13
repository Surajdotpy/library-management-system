import apiClient from './client';
import type { 
  Attendance,
  MarkEntryRequest,
  MarkExitRequest,
  TodayAttendance,
  AttendanceStats,
  ApiResponse
} from '@/types';

export const attendanceApi = {
  async markEntry(data: MarkEntryRequest): Promise<Attendance> {
    const response = await apiClient.post<ApiResponse<Attendance>>('/attendance/entry', data);
    if (!response.data.data) {
      throw new Error('Failed to mark entry');
    }
    return response.data.data;
  },

  async markExit(data: MarkExitRequest): Promise<Attendance> {
    const response = await apiClient.post<ApiResponse<Attendance>>('/attendance/exit', data);
    if (!response.data.data) {
      throw new Error('Failed to mark exit');
    }
    return response.data.data;
  },

  async getToday(): Promise<TodayAttendance[]> {
    const response = await apiClient.get<ApiResponse<TodayAttendance[]>>('/attendance/today');
    return response.data.data || [];
  },

  async getStudentHistory(studentId: number, startDate?: string, endDate?: string): Promise<Attendance[]> {
    const response = await apiClient.get<ApiResponse<Attendance[]>>(`/attendance/student/${studentId}`, {
      params: { start_date: startDate, end_date: endDate }
    });
    return response.data.data || [];
  },

  async getStudentStats(studentId: number): Promise<AttendanceStats> {
    const response = await apiClient.get<ApiResponse<AttendanceStats>>(`/attendance/student/${studentId}/stats`);
    if (!response.data.data) {
      throw new Error('Failed to get stats');
    }
    return response.data.data;
  },
};