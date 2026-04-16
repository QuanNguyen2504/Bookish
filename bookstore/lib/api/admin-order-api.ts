// lib/api/admin-order-api.ts
import { OrderResponse } from './order-api';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export interface BulkConfirmRequest {
  orderIds?: number[];
}

export interface BulkConfirmResponse {
  successCount: number;
  failedCount: number;
  confirmedOrderIds: number[];
  failedOrders: {
    orderId: number;
    reason: string;
  }[];
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

export const adminOrderApi = {
  getAll: (token: string) =>
    request<OrderResponse[]>('/api/admin/orders', { method: 'GET' }, token),

  updateStatus: (orderId: number, status: string, token: string) =>
    request<OrderResponse>(
      `/api/admin/orders/${orderId}/status?status=${status}`,
      { method: 'PATCH' },
      token
    ),

  bulkConfirm: (req: BulkConfirmRequest, token: string) =>
    request<BulkConfirmResponse>(
      '/api/admin/orders/bulk-confirm',
      { method: 'POST', body: JSON.stringify(req) },
      token
    ),

  bulkShip: (req: BulkConfirmRequest, token: string) =>
    request<BulkConfirmResponse>(
      '/api/admin/orders/bulk-ship',
      { method: 'POST', body: JSON.stringify(req) },
      token
    ),
};