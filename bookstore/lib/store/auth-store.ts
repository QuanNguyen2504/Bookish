'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '@/lib/api';

interface LoginResponse {
  statusCode: number;
  message: string;
  data: {
    token: string;
    role: 'USER' | 'ADMIN' | 'STAFF';
    id: number;
    username: string;
    avatarUrl: string | null; // backend trả về sau khi thêm vào LoginResponse
  };
}

interface RegisterResponse {
  statusCode: number;
  message: string;
  data: {
    id: number;
    username: string;
    email: string;
    role: string;
  };
}

interface AuthUser {
  id: number;        // 👈 THÊM MỚI
  username: string;
  email?: string;
  role: 'USER' | 'ADMIN' | 'STAFF';
  avatarUrl?: string | null; // 👈 THÊM MỚI (để dùng sau khi upload avatar)
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  login: (username: string, password: string) => Promise<{ success: boolean; message: string }>;
  register: (username: string, email: string, password: string) => Promise<{ success: boolean; message: string }>;
  logout: () => void;
  updateAvatar: (avatarUrl: string | null) => void; // 👈 THÊM MỚI
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (username: string, password: string) => {
        set({ isLoading: true });
        try {
          const res = await api.post<LoginResponse>('/auth/login', { username, password });
          const { token, role, id, avatarUrl } = res.data;

          set({
            token,
            user: { id, username, role, avatarUrl }, // lưu avatarUrl từ login response
            isAuthenticated: true,
            isLoading: false,
          });

          const { useCartStore } = await import('@/lib/store/cart-store');
          useCartStore.getState().fetchCart(token);

          return { success: true, message: res.message || 'Đăng nhập thành công!' };
        } catch (error) {
          set({ isLoading: false });
          const message = error instanceof Error ? error.message : 'Đăng nhập thất bại!';
          return { success: false, message };
        }
      },

      register: async (username: string, email: string, password: string) => {
        set({ isLoading: true });
        try {
          const res = await api.post<RegisterResponse>('/auth/register', {
            username,
            email,
            password,
          });
          set({ isLoading: false });
          return { success: true, message: res.message || 'Đăng ký thành công!' };
        } catch (error) {
          set({ isLoading: false });
          const message = error instanceof Error ? error.message : 'Đăng ký thất bại!';
          return { success: false, message };
        }
      },

      logout: () => {
        import('@/lib/store/cart-store').then(({ useCartStore }) => {
          useCartStore.setState({ cart: null });
        });
        set({ user: null, token: null, isAuthenticated: false });
      },

      // Cập nhật avatarUrl trong store sau khi upload/xóa thành công
      updateAvatar: (avatarUrl: string | null) => {
        set((state) => ({
          user: state.user ? { ...state.user, avatarUrl } : null,
        }));
      },
    }),
    {
      name: 'bookish-auth',
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);