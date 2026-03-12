/**
 * Attendance API calls
 */

import apiClient from './client';
import type { 
  Attendance, 
  MarkEntryRequest, 
  MarkExitRequest,
  TodayAttendance,
  AttendanceStats 
} from '@/types';

export const attendanceApi = {
  /**
   * Mark student entry (check-in)
   */
  markEntry: async (data: MarkEntryRequest): Promise<Attendance> => {
    const response = await apiClient.post<{ attendance: Attendance }>('/attendance/entry', data);
    return response.data.attendance;
  },

  /**
   * Mark student exit (check-out)
   */
  markExit: async (data: MarkExitRequest): Promise<Attendance> => {
    const response = await apiClient.post<{ attendance: Attendance }>('/attendance/exit', data);
    return response.data.attendance;
  },

  /**
   * Get today's attendance (who's inside now)
   */
  getToday: async (): Promise<TodayAttendance[]> => {
    const response = await apiClient.get<{ attendance: TodayAttendance[] }>('/attendance/today');
    return response.data.attendance;
  },

  /**
   * Get student attendance history
   */
  getStudentHistory: async (studentId: number): Promise<Attendance[]> => {
    const response = await apiClient.get<{ attendance: Attendance[] }>(`/attendance/student/${studentId}`);
    return response.data.attendance;
  },

  /**
   * Get student attendance statistics
   */
  getStudentStats: async (studentId: number): Promise<AttendanceStats> => {
    const response = await apiClient.get<AttendanceStats>(`/attendance/student/${studentId}/stats`);
    return response.data;
  },
};