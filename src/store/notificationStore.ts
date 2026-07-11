import { create } from 'zustand';
import axios from 'axios';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'BILL_REMINDER' | 'BUDGET_EXCEEDED' | 'INSIGHT' | 'GENERAL';
  isRead: boolean;
  createdAt: string;
}

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  fetchNotifications: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,

  fetchNotifications: async () => {
    set({ isLoading: true });
    try {
      const response = await axios.get('/api/intelligence/notifications');
      const list = response.data || [];
      const unread = list.filter((n: Notification) => !n.isRead).length;
      set({ notifications: list, unreadCount: unread, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  markAsRead: async (id) => {
    try {
      await axios.put(`/api/intelligence/notifications/${id}/read`);
      const list = get().notifications.map((n) =>
        n.id === id ? { ...n, isRead: true } : n
      );
      const unread = list.filter((n) => !n.isRead).length;
      set({ notifications: list, unreadCount: unread });
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  },
}));
