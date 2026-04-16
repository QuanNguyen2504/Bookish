// lib/api/category-api.ts

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

// Khớp với CategoryResponse.java
export interface CategoryResponse {
  id: number;
  name: string;
}

// Khớp với CategoryRequest.java
export interface CategoryRequest {
  name: string;
}

// Khớp với ApiResponse.java (backend wrap data trong này)
interface ApiResponse<T> {
  statusCode: number;
  message: string;
  data: T;
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

  const data: ApiResponse<T> = await response.json();
  if (!response.ok) throw new Error(data.message || 'Có lỗi xảy ra');
  return data.data;
}

export const categoryApi = {
  // GET /categories - public
  getAll: () =>
    request<CategoryResponse[]>('/categories', { method: 'GET' }),

  // POST /categories - cần token ADMIN/STAFF
  create: (body: CategoryRequest, token: string) =>
    request<CategoryResponse>('/categories', {
      method: 'POST',
      body: JSON.stringify(body),
    }, token),

  // PUT /categories/:id
  update: (id: number, body: CategoryRequest, token: string) =>
    request<CategoryResponse>(`/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }, token),

  // DELETE /categories/:id
  delete: (id: number, token: string) =>
    request<void>(`/categories/${id}`, { method: 'DELETE' }, token),
};