import apiClient from './client';

export interface OverviewStats {
  total_revenue: number;
  total_students: number;
  avg_occupancy: number;
  growth_rate: number;
}

export interface RevenueTrendItem {
  month: string;
  revenue: number;
}

export interface StudentGrowthItem {
  month: string;
  students: number;
}

export interface BranchComparisonItem {
  branch_id: number;
  branch_name: string;
  branch_code: string;
  total_students: number;
  active_students: number;
  monthly_revenue: number;
  total_capacity: number;
  currently_inside: number;
  occupancy_rate: string;
}

export interface AttendancePatternItem {
  date: string;
  unique_students: number;
  total_entries: number;
}

export const reportsApi = {
  // Get overview stats
  async getOverview(): Promise<OverviewStats> {
    const response = await apiClient.get('/reports/overview');
    return response.data.data;
  },

  // Get revenue trend
  async getRevenueTrend(months: number = 6): Promise<RevenueTrendItem[]> {
    const response = await apiClient.get(`/reports/revenue-trend?months=${months}`);
    return response.data.data;
  },

  // Get student growth
  async getStudentGrowth(months: number = 6): Promise<StudentGrowthItem[]> {
    const response = await apiClient.get(`/reports/student-growth?months=${months}`);
    return response.data.data;
  },

  // Get branch comparison
  async getBranchComparison(): Promise<BranchComparisonItem[]> {
    const response = await apiClient.get('/reports/branch-comparison');
    return response.data.data;
  },

  // Get attendance patterns
  async getAttendancePatterns(days: number = 30): Promise<AttendancePatternItem[]> {
    const response = await apiClient.get(`/reports/attendance-patterns?days=${days}`);
    return response.data.data;
  },
};