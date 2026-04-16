'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import Image from 'next/image';
import { useAuthStore } from '@/lib/store/auth-store';
import { adminOrderApi } from '@/lib/api/admin-order-api';
import { orderApi, OrderResponse } from '@/lib/api/order-api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useOrderNotification } from '@/hooks/use-order-notification';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Search, Eye, ShoppingCart, Filter, Loader2,
  Banknote, QrCode, MapPin, Phone, ArrowRight, RefreshCw, CheckCircle2,
  CheckCheck, Zap, Truck,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const fmt = (v: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(v);

const fmtDate = (s: string) =>
  new Date(s).toLocaleDateString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

const STATUS_CONFIG: Record<string, { label: string; className: string; step: number }> = {
  PENDING:    { label: 'Chờ xác nhận', className: 'bg-amber-100 text-amber-700',   step: 1 },
  CONFIRMED:  { label: 'Đã xác nhận',  className: 'bg-blue-100 text-blue-700',     step: 2 },
  PROCESSING: { label: 'Đang xử lý',   className: 'bg-purple-100 text-purple-700', step: 3 },
  SHIPPING:   { label: 'Đang giao',    className: 'bg-indigo-100 text-indigo-700', step: 4 },
  DELIVERED:  { label: 'Hoàn thành',   className: 'bg-emerald-100 text-emerald-700', step: 5 },
  CANCELLED:  { label: 'Đã hủy',       className: 'bg-red-100 text-red-700',       step: 0 },
};

const NEXT_STATUS: Record<string, string | null> = {
  PENDING:    'CONFIRMED',
  CONFIRMED:  'PROCESSING',
  PROCESSING: 'SHIPPING',
  SHIPPING:   'DELIVERED',
  DELIVERED:  null,
  CANCELLED:  null,
};

const NEXT_LABEL: Record<string, string> = {
  PENDING:    'Xác nhận đơn',
  CONFIRMED:  'Bắt đầu xử lý',
  PROCESSING: 'Bàn giao vận chuyển',
  SHIPPING:   'Xác nhận đã giao',
};

const POLL_INTERVAL = 30000;

function StatCard({ label, count, className }: { label: string; count: number; className: string }) {
  return (
    <div className={cn('rounded-xl p-4 text-center', className)}>
      <p className="text-2xl font-bold">{count}</p>
      <p className="text-xs mt-1 opacity-80">{label}</p>
    </div>
  );
}

function StatusTimeline({ status }: { status: string }) {
  const steps = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPING', 'DELIVERED'];
  const currentStep = STATUS_CONFIG[status]?.step ?? 0;
  if (status === 'CANCELLED') return (
    <div className="flex items-center gap-2 bg-red-50 rounded-xl p-3">
      <div className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
      <span className="text-sm text-red-700 font-medium">Đơn hàng đã bị hủy</span>
    </div>
  );
  return (
    <div className="flex items-center gap-1">
      {steps.map((s, i) => {
        const cfg = STATUS_CONFIG[s];
        const done = currentStep > i + 1;
        const active = currentStep === i + 1;
        return (
          <div key={s} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1">
              <div className={cn(
                'w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium border-2 transition-colors',
                done ? 'bg-primary border-primary' :
                active ? 'border-primary text-primary bg-primary/10' :
                'border-border text-muted-foreground bg-background'
              )}>
                {done ? <CheckCircle2 className="h-3.5 w-3.5 text-white" /> : i + 1}
              </div>
              <span className={cn('text-[10px] text-center leading-tight w-14',
                active ? 'text-primary font-medium' : 'text-muted-foreground')}>
                {cfg.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={cn('h-0.5 flex-1 mx-1 mb-4 transition-colors',
                done ? 'bg-primary' : 'bg-border')} />
            )}
          </div>
        );
      })}
    </div>
  );
}


export default function AdminOrdersPage() {
  const token = useAuthStore((state) => state.token);
  const [orders, setOrders] = useState<OrderResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selected, setSelected] = useState<OrderResponse | null>(null);
  const [updating, setUpdating] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [polling, setPolling] = useState(false);

  // 🔥 Bulk states
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [confirmAllDialogOpen, setConfirmAllDialogOpen] = useState(false);
  const [shipAllDialogOpen, setShipAllDialogOpen] = useState(false);
  // Mode chọn: 'confirm' = chọn đơn PENDING CASH, 'ship' = chọn đơn PROCESSING
  const [bulkMode, setBulkMode] = useState<'confirm' | 'ship'>('confirm');

  useOrderNotification({
    onNewOrder: () => fetchOrders(true),
  });

  const fetchOrders = useCallback(async (silent = false) => {
    if (!token) return;
    if (!silent) setLoading(true);
    else setPolling(true);
    try {
      const data = await adminOrderApi.getAll(token);
      setOrders(data);
      setSelected(prev => prev ? (data.find(o => o.orderId === prev.orderId) ?? prev) : null);
      setLastUpdated(new Date());
    } catch { if (!silent) toast.error('Không thể tải đơn hàng'); }
    finally { setLoading(false); setPolling(false); }
  }, [token]);

  useEffect(() => { fetchOrders(false); }, [fetchOrders]);

  useEffect(() => {
    const interval = setInterval(() => fetchOrders(true), POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  const handleNextStatus = async (order: OrderResponse) => {
    const next = NEXT_STATUS[order.status];
    if (!next || !token) return;
    setUpdating(true);
    try {
      let updated: OrderResponse;
      if (next === 'SHIPPING') {
        updated = await orderApi.confirmShipping(order.orderId, token);
      } else {
        updated = await adminOrderApi.updateStatus(order.orderId, next, token);
      }
      setOrders(prev => prev.map(o => o.orderId === updated.orderId ? updated : o));
      setSelected(updated);
      toast.success(`Đã chuyển sang: ${STATUS_CONFIG[next].label}`);
    } catch (e: any) { toast.error(e.message); }
    finally { setUpdating(false); }
  };

  const handleCancelOrder = async (order: OrderResponse) => {
    if (!token) return;
    if (!confirm('Bạn có chắc muốn hủy đơn hàng này không?')) return;
    setUpdating(true);
    try {
      const updated = await adminOrderApi.updateStatus(order.orderId, 'CANCELLED', token);
      setOrders(prev => prev.map(o => o.orderId === updated.orderId ? updated : o));
      setSelected(updated);
      toast.success('Đã hủy đơn hàng!');
    } catch (e: any) { toast.error(e.message); }
    finally { setUpdating(false); }
  };

  // 🔥 Bulk confirm các đơn đã chọn
  const handleBulkConfirmSelected = async () => {
    if (!token || selectedIds.length === 0) return;
    setBulkLoading(true);
    try {
      const result = await adminOrderApi.bulkConfirm({ orderIds: selectedIds }, token);
      if (result.successCount > 0) toast.success(`Đã xác nhận ${result.successCount} đơn hàng`);
      if (result.failedCount > 0) {
        const reasons = result.failedOrders.map(f => `#${f.orderId}: ${f.reason}`).join('\n');
        toast.warning(`${result.failedCount} đơn không thể xác nhận:\n${reasons}`);
      }
      setSelectedIds([]);
      await fetchOrders(true);
    } catch (e: any) {
      toast.error(e.message || 'Xác nhận hàng loạt thất bại');
    } finally {
      setBulkLoading(false);
    }
  };

  // 🔥 Bulk confirm TẤT CẢ đơn CASH PENDING
  const handleConfirmAllPending = async () => {
    if (!token) return;
    setBulkLoading(true);
    setConfirmAllDialogOpen(false);
    try {
      const result = await adminOrderApi.bulkConfirm({}, token);
      if (result.successCount > 0) toast.success(`Đã xác nhận ${result.successCount} đơn CASH PENDING`);
      else toast.info('Không có đơn nào được xác nhận');
      if (result.failedCount > 0) toast.warning(`${result.failedCount} đơn không thể xác nhận (kiểm tra tồn kho)`);
      setSelectedIds([]);
      await fetchOrders(true);
    } catch (e: any) {
      toast.error(e.message || 'Xác nhận hàng loạt thất bại');
    } finally {
      setBulkLoading(false);
    }
  };

  // 🔥 Bulk ship các đơn đã chọn
  const handleBulkShipSelected = async () => {
    if (!token || selectedIds.length === 0) return;
    setBulkLoading(true);
    try {
      const result = await adminOrderApi.bulkShip({ orderIds: selectedIds }, token);
      if (result.successCount > 0) toast.success(`Đã bàn giao ${result.successCount} đơn cho vận chuyển`);
      if (result.failedCount > 0) {
        const reasons = result.failedOrders.map(f => `#${f.orderId}: ${f.reason}`).join('\n');
        toast.warning(`${result.failedCount} đơn không thể bàn giao:\n${reasons}`);
      }
      setSelectedIds([]);
      await fetchOrders(true);
    } catch (e: any) {
      toast.error(e.message || 'Bàn giao hàng loạt thất bại');
    } finally {
      setBulkLoading(false);
    }
  };

  // 🔥 Bulk ship TẤT CẢ đơn PROCESSING
  const handleShipAllProcessing = async () => {
    if (!token) return;
    setBulkLoading(true);
    setShipAllDialogOpen(false);
    try {
      const result = await adminOrderApi.bulkShip({}, token);
      if (result.successCount > 0) toast.success(`Đã bàn giao ${result.successCount} đơn cho vận chuyển`);
      else toast.info('Không có đơn nào được bàn giao');
      setSelectedIds([]);
      await fetchOrders(true);
    } catch (e: any) {
      toast.error(e.message || 'Bàn giao hàng loạt thất bại');
    } finally {
      setBulkLoading(false);
    }
  };

  const toggleSelectOrder = (orderId: number, status: string, paymentMethod: string) => {
    // Quyết định mode dựa vào đơn đầu tiên được chọn
    if (selectedIds.length === 0) {
      setBulkMode(status === 'PROCESSING' ? 'ship' : 'confirm');
    }
    setSelectedIds(prev =>
      prev.includes(orderId)
        ? prev.filter(id => id !== orderId)
        : [...prev, orderId]
    );
  };

  const filtered = useMemo(() => orders.filter(o => {
    const matchSearch =
      String(o.orderId).includes(searchTerm) ||
      (o.phone ?? '').includes(searchTerm) ||
      (o.shippingAddress ?? '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === 'all' || o.status === statusFilter;
    return matchSearch && matchStatus;
  }), [orders, searchTerm, statusFilter]);

  // 🔥 Đơn nào có thể chọn checkbox: tùy theo mode đang chọn
  const canSelectOrder = (o: OrderResponse): boolean => {
    if (selectedIds.length === 0) {
      // Chưa chọn gì → cho phép chọn cả PENDING CASH lẫn PROCESSING
      return (o.status === 'PENDING' && o.paymentMethod === 'CASH') || o.status === 'PROCESSING';
    }
    // Đã chọn rồi → giữ nguyên mode
    if (bulkMode === 'confirm') return o.status === 'PENDING' && o.paymentMethod === 'CASH';
    return o.status === 'PROCESSING';
  };

  const stats = useMemo(() => ({
    total: orders.length,
    pending: orders.filter(o => o.status === 'PENDING').length,
    pendingCash: orders.filter(o => o.status === 'PENDING' && o.paymentMethod === 'CASH').length,
    processing: orders.filter(o => o.status === 'PROCESSING').length,
    shipping: orders.filter(o => o.status === 'SHIPPING').length,
    delivered: orders.filter(o => o.status === 'DELIVERED').length,
    cancelled: orders.filter(o => o.status === 'CANCELLED').length,
  }), [orders]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Quản lý Đơn hàng</h1>
          <p className="text-muted-foreground text-sm">
            {lastUpdated && `Cập nhật lúc ${lastUpdated.toLocaleTimeString('vi-VN')} · tự động mỗi 30s`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {/* 🔥 Nút xác nhận tất cả CASH PENDING */}
          {stats.pendingCash > 0 && (
            <Button
              variant="default"
              size="sm"
              className="gap-2 bg-amber-600 hover:bg-amber-700"
              onClick={() => setConfirmAllDialogOpen(true)}
              disabled={bulkLoading}
            >
              <Zap className="h-4 w-4" />
              Xác nhận tất cả ({stats.pendingCash} CASH)
            </Button>
          )}
          {/* 🔥 Nút bàn giao tất cả PROCESSING */}
          {stats.processing > 0 && (
            <Button
              variant="default"
              size="sm"
              className="gap-2 bg-purple-600 hover:bg-purple-700"
              onClick={() => setShipAllDialogOpen(true)}
              disabled={bulkLoading}
            >
              <Truck className="h-4 w-4" />
              Bàn giao tất cả ({stats.processing} đơn)
            </Button>
          )}
          <Button variant="outline" size="sm" className="gap-2" onClick={() => fetchOrders(true)} disabled={polling}>
            <RefreshCw className={cn('h-4 w-4', polling && 'animate-spin')} />
            Làm mới
          </Button>
        </div>
      </div>

      {/* Thống kê */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <StatCard label="Tổng đơn"      count={stats.total}     className="bg-muted text-foreground" />
        <StatCard label="Chờ xác nhận"  count={stats.pending}   className="bg-amber-100 text-amber-800" />
        <StatCard label="Đang xử lý"    count={stats.processing} className="bg-purple-100 text-purple-800" />
        <StatCard label="Đang giao"     count={stats.shipping}  className="bg-indigo-100 text-indigo-800" />
        <StatCard label="Hoàn thành"    count={stats.delivered} className="bg-emerald-100 text-emerald-800" />
        <StatCard label="Đã hủy"        count={stats.cancelled} className="bg-red-100 text-red-800" />
      </div>

      {/* Filter */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 md:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Tìm theo mã đơn, SĐT, địa chỉ..."
                value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-52">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Trạng thái" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả trạng thái</SelectItem>
                {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* 🔥 Toolbar bulk action */}
      {selectedIds.length > 0 && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-primary bg-primary/5 p-3">
          <span className="text-sm font-medium text-foreground">
            Đã chọn <span className="text-primary">{selectedIds.length}</span> đơn hàng
            <span className="ml-2 text-xs text-muted-foreground">
              ({bulkMode === 'confirm' ? 'Xác nhận PENDING' : 'Bàn giao PROCESSING'})
            </span>
          </span>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setSelectedIds([])}>
              Bỏ chọn
            </Button>
            {bulkMode === 'confirm' ? (
              <Button
                size="sm"
                className="gap-2"
                onClick={handleBulkConfirmSelected}
                disabled={bulkLoading}
              >
                {bulkLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCheck className="h-4 w-4" />}
                Xác nhận đã chọn
              </Button>
            ) : (
              <Button
                size="sm"
                className="gap-2 bg-purple-600 hover:bg-purple-700"
                onClick={handleBulkShipSelected}
                disabled={bulkLoading}
              >
                {bulkLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Truck className="h-4 w-4" />}
                Bàn giao đã chọn
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Bảng */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Danh sách đơn hàng ({filtered.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-12 text-center"><Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" /></div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10"></TableHead>
                    <TableHead>Mã đơn</TableHead>
                    <TableHead>Khách hàng</TableHead>
                    <TableHead>Sản phẩm</TableHead>
                    <TableHead>PTTT</TableHead>
                    <TableHead className="text-right">Tổng tiền</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead>Hành động nhanh</TableHead>
                    <TableHead>Ngày đặt</TableHead>
                    <TableHead className="text-right">Chi tiết</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                        Không có đơn hàng nào
                      </TableCell>
                    </TableRow>
                  ) : filtered.map((order) => {
                    const cfg = STATUS_CONFIG[order.status] ?? { label: order.status, className: 'bg-gray-100 text-gray-700' };
                    const nextStatus = NEXT_STATUS[order.status];
                    const canSelect = canSelectOrder(order);
                    const isChecked = selectedIds.includes(order.orderId);
                    return (
                      <TableRow
                        key={order.orderId}
                        className={isChecked ? 'bg-primary/5' : undefined}
                      >
                        <TableCell>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleSelectOrder(order.orderId, order.status, order.paymentMethod)}
                            disabled={!canSelect}
                            className="h-4 w-4 rounded accent-primary cursor-pointer disabled:cursor-not-allowed disabled:opacity-30"
                            title={
                              canSelect
                                ? ''
                                : selectedIds.length > 0
                                  ? `Đang ở chế độ ${bulkMode === 'confirm' ? 'xác nhận PENDING' : 'bàn giao PROCESSING'}`
                                  : 'Chỉ đơn CASH PENDING hoặc PROCESSING mới có thể chọn'
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <span className="font-mono font-medium text-primary">
                            #{String(order.orderId).padStart(6, '0')}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm">{order.phone || '—'}</p>
                            <p className="text-xs text-muted-foreground line-clamp-1 max-w-[140px]">
                              {order.shippingAddress || '—'}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">{order.items.length} sp</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-xs text-muted-foreground">
                            {order.paymentMethod === 'QR_CODE' ? 'QR' : 'COD'}
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-medium">{fmt(order.totalPrice)}</TableCell>
                        <TableCell>
                          <span className={cn('text-xs font-medium px-2 py-1 rounded-full whitespace-nowrap', cfg.className)}>
                            {cfg.label}
                          </span>
                        </TableCell>
                        <TableCell>
                          {nextStatus ? (
                            <Button size="sm" variant="outline"
                              className="text-xs h-7 gap-1 whitespace-nowrap"
                              onClick={() => handleNextStatus(order)}
                              disabled={updating}>
                              {NEXT_LABEL[order.status]}
                              <ArrowRight className="h-3 w-3" />
                            </Button>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                          {fmtDate(order.createdAt)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="outline" size="icon" onClick={() => setSelected(order)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog chi tiết */}
      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-serif">
              Chi tiết đơn #{selected && String(selected.orderId).padStart(6, '0')}
            </DialogTitle>
          </DialogHeader>

          {selected && (
            <div className="space-y-5">
              <div className="bg-muted/40 rounded-xl p-4">
                <p className="text-sm font-medium text-foreground mb-4">Tiến trình đơn hàng</p>
                <StatusTimeline status={selected.status} />
              </div>

              {NEXT_STATUS[selected.status] && (
                <div className="flex gap-3">
                  <Button className="flex-1 gap-2" onClick={() => handleNextStatus(selected)} disabled={updating}>
                    {updating ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                    {NEXT_LABEL[selected.status]}
                  </Button>
                  {selected.status === 'PENDING' && (
                    <Button variant="outline" className="border-destructive text-destructive hover:bg-destructive hover:text-white"
                      onClick={() => handleCancelOrder(selected)} disabled={updating}>
                      Hủy đơn
                    </Button>
                  )}
                </div>
              )}

              {selected.status === 'DELIVERED' && (
                <div className="flex items-center gap-2 bg-emerald-50 rounded-xl p-3">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0" />
                  <span className="text-sm text-emerald-700 font-medium">Đơn hàng đã hoàn thành</span>
                </div>
              )}

              <div>
                <h3 className="font-semibold text-foreground mb-3">Thông tin giao hàng</h3>
                <div className="rounded-xl border border-border p-4 space-y-3">
                  <div className="flex items-start gap-2">
                    <Phone className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Số điện thoại</p>
                      <p className="text-sm font-medium">{selected.phone || 'Chưa có'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Địa chỉ</p>
                      <p className="text-sm">{selected.shippingAddress || 'Chưa có'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    {selected.paymentMethod === 'QR_CODE'
                      ? <QrCode className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      : <Banknote className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    }
                    <div>
                      <p className="text-xs text-muted-foreground">Phương thức thanh toán</p>
                      <p className="text-sm">{selected.paymentMethod === 'QR_CODE' ? 'QR Code' : 'Tiền mặt (COD)'}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-foreground mb-3">Sản phẩm ({selected.items.length})</h3>
                <div className="space-y-3">
                  {selected.items.map((item) => (
                    <div key={item.orderItemId} className="flex items-center gap-3 rounded-xl border border-border p-3">
                      <div className="relative h-16 w-12 overflow-hidden rounded-lg flex-shrink-0">
                        <Image src={item.image || 'https://picsum.photos/id/24/400/600'}
                          alt={item.title} fill className="object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm line-clamp-2">{item.title}</p>
                        <p className="text-xs text-muted-foreground mt-1">{fmt(item.price)} × {item.quantity}</p>
                      </div>
                      <p className="font-semibold text-sm whitespace-nowrap">{fmt(item.subtotal)}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-border p-4 space-y-2">
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Tạm tính</span><span>{fmt(selected.totalPrice - selected.shippingFee)}</span>
                </div>
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Phí vận chuyển</span>
                  <span>{selected.shippingFee === 0 ? 'Miễn phí' : fmt(selected.shippingFee)}</span>
                </div>
                <div className="border-t border-border pt-2 flex justify-between font-bold">
                  <span>Tổng cộng</span>
                  <span className="text-primary">{fmt(selected.totalPrice)}</span>
                </div>
              </div>

              <p className="text-xs text-muted-foreground">Ngày đặt: {fmtDate(selected.createdAt)}</p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 🔥 Dialog xác nhận tất cả CASH PENDING */}
      <AlertDialog open={confirmAllDialogOpen} onOpenChange={setConfirmAllDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận tất cả đơn CASH PENDING?</AlertDialogTitle>
            <AlertDialogDescription>
              Hệ thống sẽ chuyển <strong>{stats.pendingCash}</strong> đơn hàng CASH đang chờ xác nhận
              sang trạng thái "Đang xử lý" và trừ kho. Đơn nào không đủ tồn kho sẽ bị bỏ qua.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmAllPending} className="bg-amber-600 hover:bg-amber-700">
              Xác nhận tất cả
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 🔥 Dialog bàn giao tất cả PROCESSING */}
      <AlertDialog open={shipAllDialogOpen} onOpenChange={setShipAllDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bàn giao tất cả đơn đang xử lý?</AlertDialogTitle>
            <AlertDialogDescription>
              Hệ thống sẽ chuyển <strong>{stats.processing}</strong> đơn hàng đang xử lý
              sang trạng thái "Đang giao" (đã bàn giao cho đơn vị vận chuyển).
              Hãy chắc chắn rằng tất cả đơn đã được đóng gói xong.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={handleShipAllProcessing} className="bg-purple-600 hover:bg-purple-700">
              Bàn giao tất cả
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}