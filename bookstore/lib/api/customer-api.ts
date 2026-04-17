// lib/api/customer-api.ts

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export interface CustomerResponse {
  id: number;
  username: string;
  email: string;
  phone: string | null;
  address: string | null;
  avatarUrl: string | null; // 👈 THÊM MỚI
  role: 'USER' | 'ADMIN' | 'STAFF';
  createdAt: string;
}

export interface UpdateCustomerRequest {
  username: string;
  email: string;
  phone?: string;
  address?: string;
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

  if (response.status === 204 || response.headers.get('content-length') === '0') {
    if (!response.ok) throw new Error('Có lỗi xảy ra');
    return undefined as T;
  }

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) throw new Error(data?.message || 'Có lỗi xảy ra');
  return data as T;
}

export const customerApi = {
  getAll: (token: string) =>
    request<CustomerResponse[]>('/customers', { method: 'GET' }, token),

  create: (body: UpdateCustomerRequest & { password: string }, token: string) =>
    request<CustomerResponse>('/customers', {
      method: 'POST',
      body: JSON.stringify(body),
    }, token),

  update: (id: number, body: UpdateCustomerRequest, token: string) =>
    request<CustomerResponse>(`/customers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }, token),

    

  delete: (id: number, token: string) =>
    request<void>(`/customers/${id}`, { method: 'DELETE' }, token),

  // 👇 THÊM MỚI — upload avatar (dùng multipart/form-data, không set Content-Type thủ công)
  uploadAvatar: async (id: number, file: File, token: string): Promise<CustomerResponse> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE_URL}/users/${id}/avatar`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });

    const text = await response.text();
    const data = text ? JSON.parse(text) : null;
    if (!response.ok) throw new Error(data?.message || 'Upload ảnh thất bại');
    return data as CustomerResponse;
  },

  // 👇 THÊM MỚI — xóa avatar
  deleteAvatar: async (id: number, token: string): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/users/${id}/avatar`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) throw new Error('Xóa ảnh thất bại');
  },
};