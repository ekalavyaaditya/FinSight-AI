import { create } from 'zustand';
import axios from 'axios';

interface User {
  id: string;
  email: string;
  fullName: string;
  role: 'USER' | 'ADMIN';
  creditScore: number;
  currency: string;
  riskProfile: 'CONSERVATIVE' | 'MODERATE' | 'AGGRESSIVE';
}

interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  register: (email: string, password: string, fullName: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (fullName: string, currency: string, riskProfile: string) => Promise<void>;
  checkSession: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: JSON.parse(localStorage.getItem('finsight_user') || 'null'),
  token: localStorage.getItem('finsight_token'),
  refreshToken: localStorage.getItem('finsight_refresh_token'),
  isAuthenticated: !!localStorage.getItem('finsight_token'),
  isLoading: false,

  login: async (email, password, rememberMe = false) => {
    set({ isLoading: true });
    try {
      const response = await axios.post('/api/auth/login', { email, password, rememberMe });
      const { accessToken, refreshToken, user } = response.data;

      localStorage.setItem('finsight_token', accessToken);
      localStorage.setItem('finsight_refresh_token', refreshToken);
      localStorage.setItem('finsight_user', JSON.stringify(user));

      set({
        token: accessToken,
        refreshToken,
        user,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error: any) {
      set({ isLoading: false });
      throw new Error(error.response?.data?.error || 'Authentication failed');
    }
  },

  register: async (email, password, fullName) => {
    set({ isLoading: true });
    try {
      await axios.post('/api/auth/register', { email, password, fullName });
      set({ isLoading: false });
    } catch (error: any) {
      set({ isLoading: false });
      throw new Error(error.response?.data?.error || 'Registration failed');
    }
  },

  logout: async () => {
    const rToken = get().refreshToken;
    try {
      await axios.post('/api/auth/logout', { refreshToken: rToken });
    } catch {
      // Ignore failure on logout API
    }
    localStorage.removeItem('finsight_token');
    localStorage.removeItem('finsight_refresh_token');
    localStorage.removeItem('finsight_user');

    set({
      token: null,
      refreshToken: null,
      user: null,
      isAuthenticated: false,
    });
  },

  updateProfile: async (fullName, currency, riskProfile) => {
    const token = get().token;
    try {
      const response = await axios.put(
        '/api/auth/profile',
        { fullName, currency, riskProfile },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const updatedUser = response.data.user;
      localStorage.setItem('finsight_user', JSON.stringify(updatedUser));
      set({ user: updatedUser });
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to update profile');
    }
  },

  checkSession: async () => {
    const token = get().token;
    const rToken = get().refreshToken;
    if (!token || !rToken) return;

    try {
      // Simple verification check by loading profile
      const response = await axios.get('/api/auth/profile', {
        headers: { Authorization: `Bearer ${token}` },
      });
      set({ user: response.data, isAuthenticated: true });
    } catch (error: any) {
      // If unauthorized, attempt token refresh
      if (error.response?.status === 401 && rToken) {
        try {
          const refreshRes = await axios.post('/api/auth/refresh', { refreshToken: rToken });
          const newAccessToken = refreshRes.data.accessToken;
          localStorage.setItem('finsight_token', newAccessToken);
          set({ token: newAccessToken, isAuthenticated: true });

          // Retry profile pull
          const profileRes = await axios.get('/api/auth/profile', {
            headers: { Authorization: `Bearer ${newAccessToken}` },
          });
          set({ user: profileRes.data });
        } catch {
          // Both expired, trigger full logout
          get().logout();
        }
      }
    }
  },
}));

// Configure global Axios Request interceptor to attach JWT automatically if present
axios.interceptors.request.use((config) => {
  const token = localStorage.getItem('finsight_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (err) => Promise.reject(err));
