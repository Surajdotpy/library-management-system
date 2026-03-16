import apiClient from './client';
import type { ApiResponse, Branch } from '@/types';

export const branchesApi = {
  async getAll(): Promise<Branch[]> {
    const response = await apiClient.get<ApiResponse<Branch[]>>('/branches');
    return response.data.data || [];
  },
};
