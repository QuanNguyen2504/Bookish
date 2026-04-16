// lib/api/author-api.ts

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export interface AuthorResponse {
  id: number;
  name: string;
  bio: string;
  birthDate: string | null;
}

export interface AuthorRequest {
  name: string;
  bio: string;
  birthDate: string | null;
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

  if (response.status === 204 || response.headers.get('content-length') === '0') {
    if (!response.ok) throw new Error('Có lỗi xảy ra');
    return undefined as T;
  }

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) throw new Error(data?.message || 'Có lỗi xảy ra');
  return data as T;
}

export const authorApi = {
  getAll: () =>
    request<AuthorResponse[]>('/authors', { method: 'GET' }),

  create: (body: AuthorRequest, token: string) =>
    request<AuthorResponse>('/authors', {
      method: 'POST',
      body: JSON.stringify(body),
    }, token),

  update: (id: number, body: AuthorRequest, token: string) =>
    request<AuthorResponse>(`/authors/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }, token),

  delete: (id: number, token: string) =>
    request<void>(`/authors/${id}`, { method: 'DELETE' }, token),
};