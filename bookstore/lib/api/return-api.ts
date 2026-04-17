// lib/api/return-api.ts

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export type ReturnReason = 'BROKEN' | 'WRONG_BOOK' | 'NOT_AS_DESCRIBED' | 'CHANGE_MIND' | 'OTHER';
export type ReturnStatus = 'REQUESTED' | 'APPROVED' | 'REJECTED' | 'RETURNED' | 'REFUNDED' | 'CANCELLED_BY_USER';

export interface ReturnRequestResponse {
  returnId: number;
  orderId: number;
  userId: number;
  username: string;
  userEmail: string;
  reason: ReturnReason;
  description?: string;
  imageUrl?: string;
  status: ReturnStatus;
  adminNote?: string;
  bankAccount?: string;
  bankName?: string;
  accountHolder?: string;
  refundAmount: number;
  orderTotal: number;
  orderPaymentMethod: string;
  orderDeliveredAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateReturnRequest {
  orderId: number;
  reason: ReturnReason;
  description?: string;
  imageUrl?: string;
}

export interface UpdateBankInfoRequest {
  bankAccount: string;
  bankName: string;
  accountHolder: string;
}

export interface AdminReturnActionRequest {
  adminNote?: string;
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

export const returnApi = {
  // ===== USER =====
  create: (req: CreateReturnRequest, token: string) =>
    request<ReturnRequestResponse>('/api/returns', { method: 'POST', body: JSON.stringify(req) }, token),

  getMyRequests: (token: string) =>
    request<ReturnRequestResponse[]>('/api/returns/my', { method: 'GET' }, token),

  updateBankInfo: (returnId: number, req: UpdateBankInfoRequest, token: string) =>
    request<ReturnRequestResponse>(`/api/returns/${returnId}/bank-info`,
      { method: 'PATCH', body: JSON.stringify(req) }, token),

  cancel: (returnId: number, token: string) =>
    request<ReturnRequestResponse>(`/api/returns/${returnId}/cancel`, { method: 'PATCH' }, token),

  // ===== ADMIN =====
  adminGetAll: (token: string) =>
    request<ReturnRequestResponse[]>('/api/admin/returns', { method: 'GET' }, token),

  adminGetById: (returnId: number, token: string) =>
    request<ReturnRequestResponse>(`/api/admin/returns/${returnId}`, { method: 'GET' }, token),

  adminApprove: (returnId: number, adminNote: string, token: string) =>
    request<ReturnRequestResponse>(`/api/admin/returns/${returnId}/approve`,
      { method: 'PATCH', body: JSON.stringify({ adminNote }) }, token),

  adminReject: (returnId: number, adminNote: string, token: string) =>
    request<ReturnRequestResponse>(`/api/admin/returns/${returnId}/reject`,
      { method: 'PATCH', body: JSON.stringify({ adminNote }) }, token),

  adminMarkReturned: (returnId: number, token: string) =>
    request<ReturnRequestResponse>(`/api/admin/returns/${returnId}/mark-returned`,
      { method: 'PATCH' }, token),

  adminMarkRefunded: (returnId: number, adminNote: string, token: string) =>
    request<ReturnRequestResponse>(`/api/admin/returns/${returnId}/mark-refunded`,
      { method: 'PATCH', body: JSON.stringify({ adminNote }) }, token),
};

export const REASON_LABELS: Record<ReturnReason, string> = {
  BROKEN: 'Sách hỏng / rách',
  WRONG_BOOK: 'Gửi sai sách',
  NOT_AS_DESCRIBED: 'Không đúng mô tả',
  CHANGE_MIND: 'Đổi ý (trừ phí ship)',
  OTHER: 'Khác',
};

export const STATUS_LABELS: Record<ReturnStatus, string> = {
  REQUESTED: 'Chờ duyệt',
  APPROVED: 'Đã duyệt — chờ user gửi hàng',
  REJECTED: 'Đã từ chối',
  RETURNED: 'Đã nhận hàng — chờ hoàn tiền',
  REFUNDED: 'Đã hoàn tiền',
  CANCELLED_BY_USER: 'User đã hủy',
};