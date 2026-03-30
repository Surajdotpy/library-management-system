import apiClient from './client';
import type { ApiResponse, NotificationList } from '@/types';

export const notificationsApi = {
  async getAll(limit: number = 20): Promise<NotificationList> {
    const response = await apiClient.get<ApiResponse<NotificationList>>('/notifications', {
      params: { limit },
    });

    if (!response.data.data) {
      throw new Error('Failed to load notifications');
    }

    return response.data.data;
  },

  async markAsRead(notificationId: number): Promise<void> {
    await apiClient.patch(`/notifications/${notificationId}/read`);
  },
};
