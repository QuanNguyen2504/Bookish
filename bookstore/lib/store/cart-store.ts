'use client';

// lib/store/cart-store.ts - Kết nối với Spring Boot backend
// KHÔNG dùng persist vì cart data lấy từ backend, không lưu localStorage

import { create } from 'zustand';
import { cartApi, CartResponse } from '@/lib/api/cart-api';

interface CartState {
  cart: CartResponse | null;
  isLoading: boolean;
  error: string | null;

  fetchCart: (token: string) => Promise<void>;
  addItem: (bookId: number, quantity: number, token: string) => Promise<{ success: boolean; message: string }>;
  updateItem: (cartItemId: number, quantity: number, token: string) => Promise<{ success: boolean; message: string }>;
  removeItem: (cartItemId: number, token: string) => Promise<{ success: boolean; message: string }>;
  clearCart: (token: string) => Promise<{ success: boolean; message: string }>;
  clearError: () => void;

  totalItems: () => number;
  totalPrice: () => number;
}

export const useCartStore = create<CartState>()((set, get) => ({
  cart: null,
  isLoading: false,
  error: null,

  fetchCart: async (token: string) => {
    set({ isLoading: true, error: null });
    try {
      const cart = await cartApi.getCart(token);
      set({ cart, isLoading: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Không thể tải giỏ hàng';
      set({ error: message, isLoading: false, cart: null });
    }
  },

  addItem: async (bookId: number, quantity: number, token: string) => {
    set({ isLoading: true, error: null });
    try {
      const cart = await cartApi.addItem(bookId, quantity, token);
      set({ cart, isLoading: false });
      return { success: true, message: 'Đã thêm vào giỏ hàng!' };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Thêm vào giỏ hàng thất bại';
      set({ error: message, isLoading: false });
      return { success: false, message };
    }
  },

  updateItem: async (cartItemId: number, quantity: number, token: string) => {
    set({ isLoading: true, error: null });
    try {
      const cart = await cartApi.updateItem(cartItemId, quantity, token);
      set({ cart, isLoading: false });
      return { success: true, message: 'Đã cập nhật số lượng!' };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Cập nhật thất bại';
      set({ error: message, isLoading: false });
      return { success: false, message };
    }
  },

  removeItem: async (cartItemId: number, token: string) => {
    set({ isLoading: true, error: null });
    try {
      const cart = await cartApi.removeItem(cartItemId, token);
      set({ cart, isLoading: false });
      return { success: true, message: 'Đã xóa khỏi giỏ hàng!' };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Xóa thất bại';
      set({ error: message, isLoading: false });
      return { success: false, message };
    }
  },

  clearCart: async (token: string) => {
    set({ isLoading: true, error: null });
    try {
      const cart = await cartApi.clearCart(token);
      set({ cart, isLoading: false });
      return { success: true, message: 'Đã xóa toàn bộ giỏ hàng!' };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Xóa thất bại';
      set({ error: message, isLoading: false });
      return { success: false, message };
    }
  },

  clearError: () => set({ error: null }),

  // Badge số lượng trên icon giỏ hàng
  totalItems: () => get().cart?.totalItems ?? 0,
  totalPrice: () => get().cart?.totalPrice ?? 0,
}));