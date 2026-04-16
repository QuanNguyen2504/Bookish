// lib/api/wishlist-api.ts

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

// Khớp với WishlistResponse.java
export interface WishlistResponse {
  wishlistId: number;
  addedAt: string;
  bookId: number;
  title: string;
  price: number;
  salePercent: number;
  image: string;
  stock: number;
  authors: string[];
  categories: string[];
  avgRating: number;
}

// Backend wrap data trong ApiResponse
interface ApiResponse<T> {
  statusCode: number;
  message: string;
  error?: string;
  data: T;
}

async function request<T>(
  endpoint: string,
  options: RequestInit,
  token: string
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });

  const data: ApiResponse<T> = await response.json();
  if (!response.ok) throw new Error(data.message || 'Có lỗi xảy ra');
  return data.data;
}

export const wishlistApi = {
  // GET /api/wishlist
  getMyWishlist: (token: string) =>
    request<WishlistResponse[]>('/api/wishlist', { method: 'GET' }, token),

  // POST /api/wishlist/{bookId}
  add: (bookId: number, token: string) =>
    request<WishlistResponse>(`/api/wishlist/${bookId}`, { method: 'POST' }, token),

  // DELETE /api/wishlist/{bookId}
  remove: (bookId: number, token: string) =>
    request<void>(`/api/wishlist/${bookId}`, { method: 'DELETE' }, token),

  // GET /api/wishlist/check/{bookId}
  check: (bookId: number, token: string) =>
    request<{ inWishlist: boolean }>(
      `/api/wishlist/check/${bookId}`,
      { method: 'GET' },
      token
    ),

  // GET /api/wishlist/count
  count: (token: string) =>
    request<{ count: number }>('/api/wishlist/count', { method: 'GET' }, token),
};