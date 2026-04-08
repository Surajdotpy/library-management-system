import apiClient from './client';
import type { ApiResponse, NotificationList } from '@/types';

export const notificationsApi = {
  /**
   * Fetch all notifications for the authenticated user.
   * Returns the list and the authoritative unread count from the backend.
   */
  async getAll(limit: number = 100): Promise<NotificationList> {
    const response = await apiClient.get<ApiResponse<NotificationList>>('/notifications', {
      params: { limit },
    });

    if (!response.data.data) {
      throw new Error('Failed to load notifications');
    }

    return response.data.data;
  },

  /**
   * Mark a single notification as read by its ID.
   */
  async markAsRead(notificationId: number): Promise<void> {
    await apiClient.patch(`/notifications/${notificationId}/read`);
  },

  /**
   * Mark ALL unread notifications as read for the authenticated user.
   * Returns the number of notifications that were marked.
   */
  async markAllAsRead(): Promise<number> {
    const response = await apiClient.patch<ApiResponse<{ marked_count: number }>>(
      '/notifications/read-all',
    );
    return response.data.data?.marked_count ?? 0;
  },
};
