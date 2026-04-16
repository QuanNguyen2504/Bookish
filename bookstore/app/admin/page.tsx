'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useAuthStore } from '@/lib/store/auth-store';
import {
  statsApi, Summary, MonthlyRevenue, DailyOrders,
  TopBook, CategoryStat, LowStockBook, OrderStatusStat,
} from '@/lib/api/stats-api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Loader2, DollarSign, ShoppingCart, TrendingUp,
  BarChart3, BookOpen, Users, Clock, Package,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Legend, PieChart, Pie, Cell, LineChart, Line,
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

const COLORS = ['#0071e3', '#A67C5D', '#F4A261', '#E9C46A', '#8B7355', '#6e6e73'];

const TOOLTIP_STYLE = {
  backgroundColor: '#ffffff',
  border: '1px solid #e5e7eb',
  borderRadius: '8px',
};

function MetricCard({
  label, value, sub, icon: Icon, iconBg, iconColor,
}: {
  label: string; value: string; sub?: string;
  icon: React.ElementType; iconBg: string; iconColor: string;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[13px] text-muted-foreground">{label}</p>
            <p className="text-[22px] font-bold tracking-[-0.02em] mt-1 text-foreground">{value}</p>
            {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
          </div>
          <div className={cn('rounded-2xl p-2.5 flex-shrink-0', iconBg)}>
            <Icon className={cn('h-5 w-5', iconColor)} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminDashboardPage() {
  const token = useAuthStore((s) => s.token);

  const [summary, setSummary]         = useState<Summary | null>(null);
  const [monthly, setMonthly]         = useState<MonthlyRevenue[]>([]);
  const [daily, setDaily]             = useState<DailyOrders[]>([]);
  const [topBooks, setTopBooks]       = useState<TopBook[]>([]);
  const [categories, setCategories]   = useState<CategoryStat[]>([]);
  const [lowStock, setLowStock]       = useState<LowStockBook[]>([]);
  const [orderStatus, setOrderStatus] = useState<OrderStatusStat[]>([]);
  const [loading, setLoading]         = useState(true);

  useEffect(() => {
    if (!token) return;
    const load = async () => {
      try {
        const [s, m, d, t, c, l, os] = await Promise.all([
          statsApi.getSummary(token),
          statsApi.getMonthlyRevenue(token),
          statsApi.getDailyOrders(token),
          statsApi.getTopBooks(token, 10),
          statsApi.getCategoryStats(token),
          statsApi.getLowStock(token, 50),
          statsApi.getOrderStatusStats(token),
        ]);
        setSummary(s); setMonthly(m); setDaily(d);
        setTopBooks(t); setCategories(c); setLowStock(l); setOrderStatus(os);
      } catch {
        toast.error('Không thể tải dữ liệu thống kê');
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

  const categoryPieData = categories.map(c => ({ name: c.name, value: c.bookCount }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-[22px] font-bold tracking-[-0.02em] text-foreground">Thống kê</h1>
        <p className="text-[14px] mt-0.5 text-muted-foreground">Tổng quan và phân tích hoạt động kinh doanh</p>
      </div>

      {/* Metric cards */}
      {summary && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <div className="xl:col-span-2">
            <MetricCard label="Tổng doanh thu" value={fmt(summary.totalRevenue)}
              icon={DollarSign} iconBg="bg-emerald-100" iconColor="text-emerald-600" />
          </div>
          <div className="xl:col-span-2">
            <MetricCard label="Tổng đơn hàng" value={String(summary.totalOrders)}
              icon={ShoppingCart} iconBg="bg-blue-100" iconColor="text-blue-600" />
          </div>
          <div className="xl:col-span-2">
            <MetricCard label="Giá trị đơn TB" value={fmt(summary.avgOrderValue)} sub="/ đơn hàng"
              icon={BarChart3} iconBg="bg-purple-100" iconColor="text-purple-600" />
          </div>
          <div className="xl:col-span-2">
            <MetricCard label="Tỷ lệ hoàn thành" value={`${summary.completionRate}%`} sub="đơn hàng"
              icon={TrendingUp} iconBg="bg-amber-100" iconColor="text-amber-600" />
          </div>
          <div className="xl:col-span-2">
            <MetricCard label="Tổng sách" value={String(summary.totalBooks)}
              icon={BookOpen} iconBg="bg-rose-100" iconColor="text-rose-600" />
          </div>
          <div className="xl:col-span-2">
            <MetricCard label="Người dùng" value={String(summary.totalUsers)}
              icon={Users} iconBg="bg-indigo-100" iconColor="text-indigo-600" />
          </div>
        </div>
      )}

      {/* Quick order status */}
      {summary && (
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="flex items-center justify-between rounded-xl bg-amber-50 border border-amber-100 px-5 py-4">
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-amber-600" />
              <span className="font-medium text-amber-700 text-sm">Chờ xác nhận</span>
            </div>
            <span className="text-2xl font-bold text-amber-600">{summary.pendingOrders}</span>
          </div>
          <div className="flex items-center justify-between rounded-xl bg-blue-50 border border-blue-100 px-5 py-4">
            <div className="flex items-center gap-3">
              <Package className="h-5 w-5 text-blue-600" />
              <span className="font-medium text-blue-700 text-sm">Đang xử lý</span>
            </div>
            <span className="text-2xl font-bold text-blue-600">{summary.processingOrders}</span>
          </div>
          <div className="flex items-center justify-between rounded-xl bg-emerald-50 border border-emerald-100 px-5 py-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-5 w-5 text-emerald-600" />
              <span className="font-medium text-emerald-700 text-sm">Hoàn thành</span>
            </div>
            <span className="text-2xl font-bold text-emerald-600">{summary.deliveredOrders}</span>
          </div>
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="revenue" className="space-y-6">
        <TabsList>
          <TabsTrigger value="revenue">Doanh thu</TabsTrigger>
          <TabsTrigger value="orders">Đơn hàng</TabsTrigger>
          <TabsTrigger value="products">Sản phẩm</TabsTrigger>
        </TabsList>

        {/* ── Doanh thu ── */}
        <TabsContent value="revenue" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="lg:col-span-2">
              <CardHeader><CardTitle className="font-serif">Doanh thu theo tháng</CardTitle></CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={monthly}>
                      <defs>
                        <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#0071e3" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#0071e3" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="month" stroke="#6e6e73" />
                      <YAxis stroke="#6e6e73" tickFormatter={fmtShort} />
                      <Tooltip formatter={(v: number) => [fmt(v), 'Doanh thu']} contentStyle={TOOLTIP_STYLE} />
                      <Area type="monotone" dataKey="revenue" stroke="#0071e3" strokeWidth={2} fill="url(#colorRev)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="font-serif">Phân bố theo danh mục</CardTitle></CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={categoryPieData} cx="50%" cy="50%" outerRadius={80}
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                        dataKey="value" labelLine={false}>
                        {categoryPieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="font-serif">Top sách doanh thu cao</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {topBooks.slice(0, 5).map((book, i) => (
                    <div key={book.bookId} className="flex items-center gap-3">
                      <span className={cn('flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white flex-shrink-0',
                        i === 0 ? 'bg-amber-500' : i === 1 ? 'bg-gray-400' : i === 2 ? 'bg-amber-700' : 'bg-gray-300')}>
                        {i + 1}
                      </span>
                      <div className="relative h-10 w-8 overflow-hidden rounded flex-shrink-0">
                        <Image src={book.image || 'https://picsum.photos/id/24/400/600'} alt={book.title} fill className="object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="truncate text-sm font-medium">{book.title}</p>
                        <p className="text-xs text-muted-foreground">{book.authorName}</p>
                      </div>
                      <p className="text-sm font-semibold text-primary whitespace-nowrap">{fmt(book.revenue)}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── Đơn hàng ── */}
        <TabsContent value="orders" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle className="font-serif">Đơn hàng 7 ngày qua</CardTitle></CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={daily}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="date" stroke="#6e6e73" />
                      <YAxis stroke="#6e6e73" allowDecimals={false} />
                      <Tooltip contentStyle={TOOLTIP_STYLE} />
                      <Bar dataKey="orders" name="Đơn hàng" fill="#0071e3" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="font-serif">Trạng thái đơn hàng</CardTitle></CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={orderStatus} cx="50%" cy="50%" outerRadius={100}
                        label={({ name, value }) => `${name}: ${value}`}
                        dataKey="value" labelLine={false}>
                        {orderStatus.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader><CardTitle className="font-serif">Xu hướng đơn hàng và doanh thu</CardTitle></CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={monthly}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="month" stroke="#6e6e73" />
                      <YAxis yAxisId="left" stroke="#6e6e73" tickFormatter={fmtShort} />
                      <YAxis yAxisId="right" orientation="right" stroke="#6e6e73" />
                      <Tooltip
                        formatter={(v: number, name: string) => [
                          name === 'revenue' ? fmt(v) : v,
                          name === 'revenue' ? 'Doanh thu' : 'Đơn hàng',
                        ]}
                        contentStyle={TOOLTIP_STYLE}
                      />
                      <Legend />
                      <Line yAxisId="left" type="monotone" dataKey="revenue" name="Doanh thu"
                        stroke="#0071e3" strokeWidth={2} dot={{ fill: '#0071e3' }} />
                      <Line yAxisId="right" type="monotone" dataKey="orders" name="Đơn hàng"
                        stroke="#A67C5D" strokeWidth={2} dot={{ fill: '#A67C5D' }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── Sản phẩm ── */}
        <TabsContent value="products" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle className="font-serif">Sách bán chạy nhất</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {topBooks.map((book, i) => (
                    <div key={book.bookId} className="flex items-center gap-3">
                      <span className={cn('flex h-8 w-8 items-center justify-center rounded-full font-bold text-white flex-shrink-0',
                        i === 0 ? 'bg-amber-500' : i === 1 ? 'bg-gray-400' : i === 2 ? 'bg-amber-700' : 'bg-gray-300')}>
                        {i + 1}
                      </span>
                      <div className="relative h-14 w-10 overflow-hidden rounded flex-shrink-0">
                        <Image src={book.image || 'https://picsum.photos/id/24/400/600'} alt={book.title} fill className="object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="truncate font-medium text-sm">{book.title}</p>
                        <p className="text-xs text-muted-foreground">{book.authorName}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-primary">{book.soldCount}</p>
                        <p className="text-xs text-muted-foreground">đã bán</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-amber-600">Cảnh báo hết hàng</CardTitle></CardHeader>
              <CardContent>
                {lowStock.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">Tất cả sách đều còn hàng tốt!</p>
                ) : (
                  <div className="space-y-4">
                    {lowStock.map((book) => (
                      <div key={book.bookId} className="flex items-center gap-3">
                        <div className="relative h-14 w-10 overflow-hidden rounded flex-shrink-0">
                          <Image src={book.image || 'https://picsum.photos/id/24/400/600'} alt={book.title} fill className="object-cover" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="truncate font-medium text-sm">{book.title}</p>
                          <p className="text-xs text-muted-foreground">{book.authorName}</p>
                        </div>
                        <div className="text-right">
                          <p className={cn('font-semibold', book.stock < 10 ? 'text-red-600' : 'text-amber-600')}>
                            {book.stock}
                          </p>
                          <p className="text-xs text-muted-foreground">còn lại</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader><CardTitle className="font-serif">Thống kê theo danh mục</CardTitle></CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={categories.map(c => ({ name: c.name, value: c.bookCount }))} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis type="number" stroke="#6e6e73" />
                      <YAxis dataKey="name" type="category" stroke="#6e6e73" width={120} />
                      <Tooltip contentStyle={TOOLTIP_STYLE} />
                      <Bar dataKey="value" name="Số sách" fill="#0071e3" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
