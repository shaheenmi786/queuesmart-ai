import { apiClient } from '../api/client';
import { NotificationItem } from '../../types';

export const notificationService = {
  async getNotifications(): Promise<{ notifications: NotificationItem[]; unread_count: number }> {
    return apiClient<{ notifications: NotificationItem[]; unread_count: number }>('/api/v1/notifications');
  },

  async markRead(id: number): Promise<{ message: string; notification: NotificationItem }> {
    return apiClient<{ message: string; notification: NotificationItem }>(`/api/v1/notifications/${id}/read`, {
      method: 'PATCH',
    });
  },

  async markAllRead(): Promise<{ message: string }> {
    return apiClient<{ message: string }>('/api/v1/notifications/read-all', {
      method: 'PATCH',
    });
  },
};
