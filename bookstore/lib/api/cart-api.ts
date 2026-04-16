// lib/api/cart-api.ts

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export interface CartItemResponse {
  cartItemId: number;
  bookId: number | null;
  title: string;
  image: string | null;
  originalPrice: number;
  salePercent: number;
  finalPrice: number;
  quantity: number;
  subtotal: number;
  stock: number;       // tồn kho, 0 = hết hàng
  deleted: boolean;    // true = sách đã bị xóa
}

export interface CartResponse {
  cartId: number;
  items: CartItemResponse[];
  totalItems: number;
  totalPrice: number;
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

export const cartApi = {
  getCart: (token: string) =>
    request<CartResponse>('/api/cart', { method: 'GET' }, token),

  addItem: (bookId: number, quantity: number, token: string) =>
    request<CartResponse>('/api/cart/add', {
      method: 'POST',
      body: JSON.stringify({ bookId, quantity }),
    }, token),

  updateItem: (cartItemId: number, quantity: number, token: string) =>
    request<CartResponse>(`/api/cart/${cartItemId}`, {
      method: 'PUT',
      body: JSON.stringify({ quantity }),
    }, token),

  removeItem: (cartItemId: number, token: string) =>
    request<CartResponse>(`/api/cart/${cartItemId}`, {
      method: 'DELETE',
    }, token),

  clearCart: (token: string) =>
    request<CartResponse>('/api/cart', {
      method: 'DELETE',
    }, token),
};