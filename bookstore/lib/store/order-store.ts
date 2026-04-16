'use client';

import { create } from 'zustand';
import { orderApi, OrderResponse, CheckoutRequest, UpdateOrderRequest } from '@/lib/api/order-api';

interface OrderState {
  orders: OrderResponse[];
  isLoading: boolean;
  error: string | null;

  checkout: (req: CheckoutRequest, token: string) => Promise<{ success: boolean; message: string; orderId?: number }>;
  fetchOrders: (token: string) => Promise<void>;
  cancelOrder: (orderId: number, token: string) => Promise<{ success: boolean; message: string }>;
  updateOrder: (orderId: number, req: UpdateOrderRequest, token: string) => Promise<{ success: boolean; message: string }>;
  clearError: () => void;
}

export const useOrderStore = create<OrderState>()((set) => ({
  orders: [],
  isLoading: false,
  error: null,

  checkout: async (req, token) => {
    set({ isLoading: true, error: null });
    try {
      const order = await orderApi.checkout(req, token);
      set((state) => ({ orders: [order, ...state.orders], isLoading: false }));
      return { success: true, message: 'Đặt hàng thành công!', orderId: order.orderId };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Đặt hàng thất bại';
      set({ error: message, isLoading: false });
      return { success: false, message, orderId: undefined };
    }
  },

  fetchOrders: async (token) => {
    set({ isLoading: true, error: null });
    try {
      const orders = await orderApi.getOrders(token);
      set({ orders, isLoading: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Không thể tải đơn hàng';
      set({ error: message, isLoading: false });
    }
  },

  cancelOrder: async (orderId, token) => {
    set({ isLoading: true, error: null });
    try {
      const updated = await orderApi.cancelOrder(orderId, token);
      set((state) => ({
        orders: state.orders.map((o) => o.orderId === orderId ? updated : o),
        isLoading: false,
      }));
      return { success: true, message: 'Đã hủy đơn hàng!' };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Hủy đơn thất bại';
      set({ error: message, isLoading: false });
      return { success: false, message };
    }
  },

  updateOrder: async (orderId, req, token) => {
    set({ isLoading: true, error: null });
    try {
      const updated = await orderApi.updateOrder(orderId, req, token);
      set((state) => ({
        orders: state.orders.map((o) => o.orderId === orderId ? updated : o),
        isLoading: false,
      }));
      return { success: true, message: 'Cập nhật thành công!' };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Cập nhật thất bại';
      set({ error: message, isLoading: false });
      return { success: false, message };
    }
  },

  clearError: () => set({ error: null }),
}));