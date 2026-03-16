import apiClient from './client';
import type { ApiResponse, DashboardSummary } from '@/types';

export const dashboardApi = {
  async getSummary(branchId?: number): Promise<DashboardSummary> {
    const response = await apiClient.get<ApiResponse<DashboardSummary>>('/dashboard/summary', {
      params: branchId ? { branch_id: branchId } : undefined,
    });

    if (!response.data.data) {
      throw new Error('Failed to load dashboard summary');
    }

    return response.data.data;
  },
};
