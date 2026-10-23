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
  notificationsUserId: string | null;
  fetchNotifications: (userId: string) => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  resetNotifications: () => void;
}

const requestsByUser = new Map<string, Promise<void>>();
const loadedUsers = new Set<string>();

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  notificationsUserId: null,

  fetchNotifications: async (userId) => {
    if (!userId) return;
    if (get().notificationsUserId !== userId) {
      set({ notificationsUserId: userId, notifications: [], unreadCount: 0 });
    }
    if (loadedUsers.has(userId)) return;

    const existingRequest = requestsByUser.get(userId);
    if (existingRequest) return existingRequest;

    set({ isLoading: true, notificationsUserId: userId });
    const request = (async () => {
      try {
        const response = await axios.get('/api/intelligence/notifications');
        const list = response.data || [];
        const unread = list.filter((n: Notification) => !n.isRead).length;
        if (get().notificationsUserId === userId) {
          set({ notifications: list, unreadCount: unread });
          loadedUsers.add(userId);
        }
      } catch {
        // Leave the user eligible for a later event-driven retry.
      } finally {
        requestsByUser.delete(userId);
        if (get().notificationsUserId === userId) set({ isLoading: false });
      }
    })();
    requestsByUser.set(userId, request);
    return request;
  },

  resetNotifications: () => {
    loadedUsers.clear();
    set({ notifications: [], unreadCount: 0, isLoading: false, notificationsUserId: null });
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
