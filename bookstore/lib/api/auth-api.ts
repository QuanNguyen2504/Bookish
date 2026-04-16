// lib/api/auth-api.ts

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

interface ApiResponse<T> {
  statusCode: number;
  message: string;
  error?: string;
  data: T;
}

// Khớp với LoginResponse.java của backend
export interface VerifyEmailResponse {
  token: string;
  role: 'USER' | 'ADMIN' | 'STAFF';
  id: number;
  username: string;
  avatarUrl: string | null;
}

async function request<T>(
  endpoint: string,
  options: RequestInit
): Promise<{ message: string; data: T }> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  const data: ApiResponse<T> = await response.json();
  if (!response.ok) throw new Error(data.message || 'Có lỗi xảy ra');
  return { message: data.message, data: data.data };
}

export const authApi = {
  verifyEmail: (email: string, code: string) =>
    request<VerifyEmailResponse>('/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({ email, code }),
    }),

  resendVerification: (email: string) =>
    request<void>('/auth/resend-verification', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

    forgotPassword: (email: string) =>
    request<void>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  resetPassword: (email: string, code: string, newPassword: string) =>
    request<void>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ email, code, newPassword }),
    }),
};

