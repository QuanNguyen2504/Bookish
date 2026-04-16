// lib/api/order-api.ts

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export interface OrderItemResponse {
  orderItemId: number;
  bookId: number;
  title: string;
  image: string;
  quantity: number;
  price: number;
  subtotal: number;
}

// 🔥 MỚI
export interface AppliedPromotionResponse {
  promotionId: number;
  code: string;
  discountType: 'PERCENT' | 'FIXED' | 'FREESHIP';
  discountAmount: number;
}

export interface OrderResponse {
  orderId: number;
  status: string;
  shippingAddress: string;
  phone: string;
  paymentMethod: string;

  // 🔥 MỚI
  subtotal: number;
  discountAmount: number;

  shippingFee: number;
  totalPrice: number;
  createdAt: string;
  items: OrderItemResponse[];

  // 🔥 MỚI: danh sách mã đã áp
  promotions?: AppliedPromotionResponse[];
}

export interface CheckoutRequest {
  cartItemIds: number[];
  shippingAddress: string;
  phone: string;
  paymentMethod: 'CASH' | 'QR_CODE';
  // 🔥 MỚI: nhiều mã/đơn
  promotionIds?: number[];
}

export interface UpdateOrderRequest {
  shippingAddress?: string;
  phone?: string;
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

export const orderApi = {
  checkout: (req: CheckoutRequest, token: string) =>
    request<OrderResponse>('/api/orders/checkout', { method: 'POST', body: JSON.stringify(req) }, token),

  getOrders: (token: string) =>
    request<OrderResponse[]>('/api/orders', { method: 'GET' }, token),

  getOrder: (orderId: number, token: string) =>
    request<OrderResponse>(`/api/orders/${orderId}`, { method: 'GET' }, token),

  confirmPayment: (orderId: number, token: string) =>
    request<OrderResponse>(`/api/orders/${orderId}/confirm-payment`, { method: 'PATCH' }, token),

  confirmShipping: (orderId: number, token: string) =>
    request<OrderResponse>(`/api/orders/${orderId}/confirm-shipping`, { method: 'PATCH' }, token),

  cancelOrder: (orderId: number, token: string) =>
    request<OrderResponse>(`/api/orders/${orderId}/cancel`, { method: 'PATCH' }, token),

  confirmDelivered: (orderId: number, token: string) =>
    request<OrderResponse>(`/api/orders/${orderId}/confirm-delivered`, { method: 'PATCH' }, token),

  updateOrder: (orderId: number, req: UpdateOrderRequest, token: string) =>
    request<OrderResponse>(`/api/orders/${orderId}`, { method: 'PATCH', body: JSON.stringify(req) }, token),

  // Admin hủy đơn (PENDING / PROCESSING, hoàn kho + hoàn mã)
  adminCancelOrder: (orderId: number, token: string) =>
    request<OrderResponse>(`/api/admin/orders/${orderId}/cancel`, { method: 'PATCH' }, token),
};