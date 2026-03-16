import apiClient from './client';
import type { AdminUser, ApiResponse, CreateAdminRequest } from '@/types';

export const usersApi = {
  async getAdmins(): Promise<AdminUser[]> {
    const response = await apiClient.get<ApiResponse<AdminUser[]>>('/users/admins');
    return response.data.data || [];
  },

  async createAdmin(data: CreateAdminRequest): Promise<AdminUser> {
    const response = await apiClient.post<ApiResponse<AdminUser>>('/users/admins', data);

    if (!response.data.data) {
      throw new Error('Failed to create admin');
    }

    return response.data.data;
  },
};
