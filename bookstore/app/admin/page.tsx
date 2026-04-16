'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useAuthStore } from '@/lib/store/auth-store';
import { statsApi, Summary, MonthlyRevenue, DailyOrders, TopBook } from '@/lib/api/stats-api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DollarSign, ShoppingCart, BookOpen, Users,
  TrendingUp, Package, Clock, Loader2,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Legend,
} from 'recharts';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const fmt = (v: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(v);

const fmtShort = (v: number) => {
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(1) + 'M';
  if (v >= 1_000)     return (v / 1_000).toFixed(1) + 'K';
  return String(v);
};

const TOOLTIP_STYLE = {
  backgroundColor: '#ffffff',
  border: '1px solid #e5e7eb',
  borderRadius: '8px',
};

export default function AdminDashboardPage() {
  const token = useAuthStore((s) => s.token);

  const [summary, setSummary]   = useState<Summary | null>(null);
  const [monthly, setMonthly]   = useState<MonthlyRevenue[]>([]);
  const [daily, setDaily]       = useState<DailyOrders[]>([]);
  const [topBooks, setTopBooks] = useState<TopBook[]>([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    if (!token) return;
    const load = async () => {
      try {
        const [s, m, d, t] = await Promise.all([
          statsApi.getSummary(token),
          statsApi.getMonthlyRevenue(token),
          statsApi.getDailyOrders(token),
          statsApi.getTopBooks(token, 5),
        ]);
        setSummary(s); setMonthly(m); setDaily(d); setTopBooks(t);
      } catch {
        toast.error('Không thể tải dữ liệu dashboard');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  const stats = summary ? [
    { title: 'Tổng doanh thu', value: fmt(summary.totalRevenue),  icon: DollarSign,  iconColor: '#34c759', iconBg: 'rgba(52,199,89,0.12)'   },
    { title: 'Tổng đơn hàng', value: String(summary.totalOrders), icon: ShoppingCart, iconColor: '#0071e3', iconBg: 'rgba(0,113,227,0.12)'   },
    { title: 'Số lượng sách', value: String(summary.totalBooks),  icon: BookOpen,    iconColor: '#ff9f0a', iconBg: 'rgba(255,159,10,0.12)'  },
    { title: 'Người dùng',    value: String(summary.totalUsers),  icon: Users,       iconColor: '#af52de', iconBg: 'rgba(175,82,222,0.12)'  },
  ] : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[22px] font-bold tracking-[-0.02em]" style={{ color: '#1d1d1f' }}>Dashboard</h1>
        <p className="text-[14px] mt-0.5" style={{ color: '#6e6e73' }}>Tổng quan hoạt động kinh doanh</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, i) => (
          <Card key={i} style={{ border: '1px solid #d2d2d7', boxShadow: 'none' }}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[13px]" style={{ color: '#6e6e73' }}>{stat.title}</p>
                  <p className="text-[22px] font-bold tracking-[-0.02em] mt-1" style={{ color: '#1d1d1f' }}>{stat.value}</p>
                </div>
                <div className="rounded-2xl p-2.5 flex-shrink-0" style={{ background: stat.iconBg }}>
                  <stat.icon className="h-5 w-5" style={{ color: stat.iconColor }} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="font-serif">Doanh thu theo tháng</CardTitle></CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthly}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0071e3" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#0071e3" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="month" stroke="#6e6e73" />
                  <YAxis stroke="#6e6e73" tickFormatter={fmtShort} />
                  <Tooltip formatter={(v: number) => [fmt(v), 'Doanh thu']} contentStyle={TOOLTIP_STYLE} />
                  <Area type="monotone" dataKey="revenue" stroke="#0071e3" strokeWidth={2} fill="url(#colorRevenue)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="font-serif">Đơn hàng 7 ngày gần nhất</CardTitle></CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={daily}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="date" stroke="#6e6e73" />
                  <YAxis stroke="#6e6e73" allowDecimals={false} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Legend />
                  <Bar dataKey="orders" name="Đơn hàng" fill="#0071e3" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Trạng thái đơn hàng */}
        {summary && (
          <Card>
            <CardHeader><CardTitle className="font-serif">Trạng thái đơn hàng</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between rounded-lg bg-amber-50 p-4">
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-amber-600" />
                  <span className="font-medium text-amber-700">Chờ xác nhận</span>
                </div>
                <span className="text-2xl font-bold text-amber-600">{summary.pendingOrders}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-blue-50 p-4">
                <div className="flex items-center gap-3">
                  <Package className="h-5 w-5 text-blue-600" />
                  <span className="font-medium text-blue-700">Đang xử lý</span>
                </div>
                <span className="text-2xl font-bold text-blue-600">{summary.processingOrders}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-emerald-50 p-4">
                <div className="flex items-center gap-3">
                  <TrendingUp className="h-5 w-5 text-emerald-600" />
                  <span className="font-medium text-emerald-700">Hoàn thành</span>
                </div>
                <span className="text-2xl font-bold text-emerald-600">{summary.deliveredOrders}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Top sách bán chạy */}
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="font-serif">Sách bán chạy nhất</CardTitle></CardHeader>
          <CardContent>
            {topBooks.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Chưa có dữ liệu bán hàng</p>
            ) : (
              <div className="space-y-4">
                {topBooks.map((book, i) => (
                  <div key={book.bookId} className="flex items-center gap-4">
                    <div className={cn(
                      'flex h-8 w-8 items-center justify-center rounded-full font-bold text-white flex-shrink-0',
                      i === 0 ? 'bg-amber-500' : i === 1 ? 'bg-gray-400' : i === 2 ? 'bg-amber-700' : 'bg-gray-300'
                    )}>
                      {i + 1}
                    </div>
                    <div className="relative h-14 w-10 overflow-hidden rounded flex-shrink-0">
                      <Image src={book.image || 'https://picsum.photos/id/24/400/600'}
                        alt={book.title} fill className="object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="truncate font-medium text-foreground">{book.title}</p>
                      <p className="text-sm text-muted-foreground">{book.authorName}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-primary">{book.soldCount}</p>
                      <p className="text-xs text-muted-foreground">đã bán</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}