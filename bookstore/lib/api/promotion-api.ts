// lib/api/promotion-api.ts

import api from '@/lib/api';

// Helper: PUT request (api.ts chỉ có get/post)
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
async function put<T>(endpoint: string, body: unknown, token?: string): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Có lỗi xảy ra');
  return data;
}

export type DiscountType = 'PERCENT' | 'FIXED' | 'FREESHIP';

export interface PromotionResponse {
  promotion_id: number;
  code: string;
  discountType: DiscountType;
  discountValue: number;
  startDate: string;
  endTime: string;
  durationDays: number;
  remainingDays: number;
  status: boolean;
  usageLimit: number;
  usedCount: number;
  // 🔥 MỚI
  minOrderValue?: number;
  maxDiscount?: number;
}

export interface PromotionRequest {
  code: string;
  discountType: DiscountType;
  discountValue: number;
  startDate: string | null;
  durationDays: number;
  status: boolean;
  usageLimit: number;
  // 🔥 MỚI
  minOrderValue?: number;
  maxDiscount?: number;
}

// 🔥 MỚI: request validate
export interface PromotionValidateRequest {
  code: string;
  totalAmount: number;
  shippingFee: number;
  appliedCodes?: string[];  // các mã đã áp trước đó
}

// 🔥 MỚI: response validate
export interface PromotionApplyResponse {
  promotionId: number;
  code: string;
  discountType: DiscountType;
  discountAmount: number;
  shippingFee: number;
  finalAmount: number;
  message: string;
}

export const promotionApi = {
  getAll: (token?: string): Promise<PromotionResponse[]> =>
    api.get<PromotionResponse[]>('/promotions', token),

  getById: (id: number, token?: string): Promise<PromotionResponse> =>
    api.get<PromotionResponse>(`/promotions/${id}`, token),

  /**
   * 🔥 Validate mã với đầy đủ điều kiện: hạn dùng, đơn tối thiểu,
   * user đã dùng chưa, xung đột loại mã với các mã đã áp.
   */
  validate: (
    body: PromotionValidateRequest,
    token?: string
  ): Promise<PromotionApplyResponse> =>
    api.post<PromotionApplyResponse>('/promotions/validate', body, token),

  create: (body: PromotionRequest, token?: string): Promise<PromotionResponse> =>
    api.post<PromotionResponse>('/promotions', body, token),

  update: (id: number, body: PromotionRequest, token?: string): Promise<PromotionResponse> =>
    put<PromotionResponse>(`/promotions/${id}`, body, token),

  delete: async (id: number, token?: string): Promise<void> => {
    const res = await fetch(`${API_BASE_URL}/promotions/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.message || 'Xóa khuyến mãi thất bại');
    }
  },
};