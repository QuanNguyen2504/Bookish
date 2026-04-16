'use client';

// lib/store/checkout-store.ts
// Lưu tạm dữ liệu từ cart page để truyền sang /checkout
// KHÔNG dùng persist — reset khi đặt hàng xong

import { create } from 'zustand';
import { PromotionResponse } from '@/lib/api/promotion-api';
import { CartItemResponse } from '@/lib/api/cart-api';

interface CheckoutState {
  selectedIds: number[];
  selectedItems: CartItemResponse[];
  appliedPromos: Record<string, PromotionResponse>;

  // Gọi từ cart page trước khi router.push('/checkout')
  setCheckoutData: (
    selectedIds: number[],
    selectedItems: CartItemResponse[],
    appliedPromos: Record<string, PromotionResponse>
  ) => void;

  reset: () => void;
}

export const useCheckoutStore = create<CheckoutState>()((set) => ({
  selectedIds: [],
  selectedItems: [],
  appliedPromos: {},

  setCheckoutData: (selectedIds, selectedItems, appliedPromos) =>
    set({ selectedIds, selectedItems, appliedPromos }),

  reset: () => set({ selectedIds: [], selectedItems: [], appliedPromos: {} }),
}));