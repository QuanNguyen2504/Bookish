// lib/api/review-api.ts

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export interface ReviewResponse {
  reviewId: number;
  userId: number;
  username: string;
  avatarUrl: string | null;
  bookId: number;
  rating: number;
  comment: string | null;
  createdAt: string;
}

export interface ReviewRequest {
  bookId: number;
  rating: number;
  comment?: string;
}

async function get<T>(endpoint: string): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${endpoint}`);
  if (!res.ok) throw new Error('Có lỗi xảy ra');
  return res.json();
}

async function post<T>(endpoint: string, body: unknown, token: string): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Có lỗi xảy ra');
  return data;
}

async function getAuth<T>(endpoint: string, token: string): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${endpoint}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Có lỗi xảy ra');
  return data;
}

export const reviewApi = {
  getByBook: (bookId: number) =>
    get<ReviewResponse[]>(`/api/reviews/book/${bookId}`),

  getAvgRating: (bookId: number) =>
    get<{ avgRating: number }>(`/api/reviews/book/${bookId}/avg`),

  canReview: (bookId: number, token: string) =>
    getAuth<{ canReview: boolean; hasReviewed: boolean }>(`/api/reviews/can-review/${bookId}`, token),

  createReview: (req: ReviewRequest, token: string) =>
    post<ReviewResponse>('/api/reviews', req, token),
};