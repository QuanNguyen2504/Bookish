// lib/api/book-api.ts

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

// Khớp với BookResponse.java
export interface BookResponse {
  bookId: number;
  title: string;
  description: string;
  price: number;
  stock: number;
  salePercent: number;
  image: string;
  createdAt: string;
  authors: string[];
  categories: string[];
  avgRating: number;
  reviewCount: number;
}

// Khớp với BookRequest.java
export interface BookRequest {
  title: string;
  description: string;
  price: number;
  stock: number;
  salePercent: number;
  image: string;
  authorIds: number[];
  categoryIds: number[];
}

// Khớp với PageResponse.java
export interface PageData<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
}

export interface BookPageParams {
  page?: number;
  size?: number;
  keyword?: string;
  categoryId?: number;
  sort?: string;
}

async function request<T>(endpoint: string, options: RequestInit, token?: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  // 204 No Content — không có body, không cần parse
  if (response.status === 204 || response.headers.get('content-length') === '0') {
    if (!response.ok) throw new Error('Có lỗi xảy ra');
    return undefined as T;
  }

  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Có lỗi xảy ra');
  return data;
}

// Helper: build query string từ params, bỏ qua undefined/null
function buildQuery(params: Record<string, unknown>): string {
  const parts = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`);
  return parts.length > 0 ? `?${parts.join('&')}` : '';
}

export const bookApi = {
  // ===================== API CŨ (giữ nguyên) =====================

  // GET /books
  getAll: () =>
    request<BookResponse[]>('/books', { method: 'GET' }),

  // GET /books/newest
  getNewest: (limit = 5) =>
    request<BookResponse[]>(`/books/newest?limit=${limit}`, { method: 'GET' }),

  // GET /books/top-selling
  getTopSelling: (limit = 5) =>
    request<BookResponse[]>(`/books/top-selling?limit=${limit}`, { method: 'GET' }),

  // GET /books/:id
  getById: (id: number) =>
    request<BookResponse>(`/books/${id}`, { method: 'GET' }),

  // GET /books/search?keyword=
  search: (keyword: string) =>
    request<BookResponse[]>(`/books/search?keyword=${encodeURIComponent(keyword)}`, { method: 'GET' }),

  // GET /books/by-category?name=Văn học
  getByCategory: (name: string) =>
    request<BookResponse[]>(`/books/by-category?name=${encodeURIComponent(name)}`, { method: 'GET' }),

  // GET /books/by-author?name=Nguyễn Nhật Ánh
  getByAuthor: (name: string) =>
    request<BookResponse[]>(`/books/by-author?name=${encodeURIComponent(name)}`, { method: 'GET' }),

  // POST /books
  create: (body: BookRequest, token: string) =>
    request<BookResponse>('/books', {
      method: 'POST',
      body: JSON.stringify(body),
    }, token),

  // PUT /books/:id
  update: (id: number, body: BookRequest, token: string) =>
    request<BookResponse>(`/books/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }, token),

  // DELETE /books/:id
  delete: (id: number, token: string) =>
    request<void>(`/books/${id}`, { method: 'DELETE' }, token),

  // ===================== PHÂN TRANG MỚI =====================

  // Dành cho user — chỉ sách chưa xóa
  getActivePaged: (params: BookPageParams = {}) =>
    request<PageData<BookResponse>>(
      `/books/page${buildQuery(params as Record<string, unknown>)}`,
      { method: 'GET' }
    ),

  // Dành cho admin — tất cả sách kể cả đã xóa
  getAdminPaged: (params: BookPageParams = {}, token?: string) =>
    request<PageData<BookResponse>>(
      `/books/admin/page${buildQuery(params as Record<string, unknown>)}`,
      { method: 'GET' },
      token
    ),
};