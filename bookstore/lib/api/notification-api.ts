// lib/api/notification-api.ts

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export interface NotificationData {
  id: number;
  type: string;
  title: string;
  message: string;
  link: string | null;
  isRead: boolean;
  createdAt: string;
}

async function request<T>(endpoint: string, options: RequestInit, token: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Có lỗi xảy ra');
  return data;
}

export const notificationApi = {
  getMyNotifications: (token: string) =>
    request<NotificationData[]>('/api/notifications/my', { method: 'GET' }, token),

  getUnreadCount: async (token: string): Promise<number> => {
    const data = await request<{ unreadCount: number }>('/api/notifications/unread-count', { method: 'GET' }, token);
    return data.unreadCount ?? 0;
  },

  markAsRead: (id: number, token: string) =>
    request<void>(`/api/notifications/${id}/read`, { method: 'PATCH' }, token),

  markAllAsRead: (token: string) =>
    request<void>('/api/notifications/mark-all-read', { method: 'PATCH' }, token),
};
