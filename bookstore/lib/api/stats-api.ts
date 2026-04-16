// lib/api/stats-api.ts

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

async function request<T>(endpoint: string, token: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Có lỗi xảy ra');
  return data;
}

export interface Summary {
  totalRevenue: number;
  totalOrders: number;
  avgOrderValue: number;
  completionRate: number;
  totalBooks: number;
  totalUsers: number;
  pendingOrders: number;
  processingOrders: number;
  deliveredOrders: number;
  cancelledOrders: number;
}

export interface MonthlyRevenue {
  month: string;
  revenue: number;
  orders: number;
}

export interface DailyOrders {
  date: string;
  orders: number;
}

export interface TopBook {
  bookId: number;
  title: string;
  image: string;
  authorName: string;
  soldCount: number;
  revenue: number;
}

export interface CategoryStat {
  name: string;
  bookCount: number;
}

export interface LowStockBook {
  bookId: number;
  title: string;
  image: string;
  authorName: string;
  stock: number;
}

export interface OrderStatusStat {
  name: string;
  value: number;
}

export const statsApi = {
  getSummary: (token: string) =>
    request<Summary>('/api/admin/stats/summary', token),

  getMonthlyRevenue: (token: string) =>
    request<MonthlyRevenue[]>('/api/admin/stats/revenue', token),

  getDailyOrders: (token: string) =>
    request<DailyOrders[]>('/api/admin/stats/daily', token),

  getTopBooks: (token: string, limit = 10) =>
    request<TopBook[]>(`/api/admin/stats/top-books?limit=${limit}`, token),

  getCategoryStats: (token: string) =>
    request<CategoryStat[]>('/api/admin/stats/categories', token),

  getLowStock: (token: string, threshold = 50) =>
    request<LowStockBook[]>(`/api/admin/stats/low-stock?threshold=${threshold}`, token),

  getOrderStatusStats: (token: string) =>
    request<OrderStatusStat[]>('/api/admin/stats/order-status', token),
};