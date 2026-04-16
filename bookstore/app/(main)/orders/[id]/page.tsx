'use client';

import { use, useEffect, useState, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ArrowLeft, MapPin, Phone, Package, Loader2,
  Pencil, X, Check, Banknote, QrCode, RefreshCw, CheckCircle2, Star
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { useAuthStore } from '@/lib/store/auth-store';
import { orderApi, OrderResponse } from '@/lib/api/order-api';
import { reviewApi } from '@/lib/api/review-api';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const statusConfig: Record<string, { label: string; className: string; step: number }> = {
  PENDING:    { label: 'Chờ xác nhận', className: 'bg-yellow-100 text-yellow-800', step: 1 },
  CONFIRMED:  { label: 'Đã xác nhận',  className: 'bg-blue-100 text-blue-800',    step: 2 },
  PROCESSING: { label: 'Đang xử lý',   className: 'bg-purple-100 text-purple-800', step: 3 },
  SHIPPING:   { label: 'Đang giao',    className: 'bg-orange-100 text-orange-800', step: 4 },
  DELIVERED:  { label: 'Đã giao',      className: 'bg-green-100 text-green-800',   step: 5 },
  CANCELLED:  { label: 'Đã hủy',       className: 'bg-red-100 text-red-800',       step: 0 },
};

const steps = ['Chờ xác nhận', 'Đã xác nhận', 'Đang xử lý', 'Đang giao', 'Đã giao'];
const POLL_INTERVAL = 30000;

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const token = useAuthStore((state) => state.token);

  const [order, setOrder] = useState<OrderResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);
  const [polling, setPolling] = useState(false);
  const [editAddress, setEditAddress] = useState(false);
  const [editPhone, setEditPhone] = useState(false);
  const [newAddress, setNewAddress] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Review state: bookId → { rating, comment, submitting, done }
  const [reviewStates, setReviewStates] = useState<Record<number, {
    rating: number; hoverRating: number; comment: string; submitting: boolean; done: boolean;
  }>>({});
  const [reviewedBooks, setReviewedBooks] = useState<Set<number>>(new Set());

  const fetchOrder = useCallback(async (silent = false) => {
    if (!token || !id) return;
    if (!silent) setLoading(true);
    else setPolling(true);
    try {
      const data = await orderApi.getOrder(Number(id), token);
      setOrder(prev => {
        if (prev && prev.status !== data.status && silent) {
          const cfg = statusConfig[data.status];
          toast.info('Trạng thái đơn hàng đã cập nhật: ' + (cfg?.label ?? data.status));
        }
        return data;
      });
      setLastUpdated(new Date());
    } catch {
      if (!silent) {
        toast.error('Không tìm thấy đơn hàng');
        router.push('/profile?tab=orders');
      }
    } finally {
      setLoading(false);
      setPolling(false);
    }
  }, [token, id, router]);

  useEffect(() => { fetchOrder(false); }, [fetchOrder]);

  // Polling mỗi 30 giây
  useEffect(() => {
    const interval = setInterval(() => fetchOrder(true), POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchOrder]);

  const handleCancel = async () => {
    if (!token || !order) return;
    if (!confirm('Bạn có chắc muốn hủy đơn hàng này không?')) return;
    setCancelling(true);
    try {
      const updated = await orderApi.cancelOrder(order.orderId, token);
      setOrder(updated);
      setLastUpdated(new Date());
      toast.success('Đã hủy đơn hàng!');
    } catch (e: any) { toast.error(e.message); }
    finally { setCancelling(false); }
  };

  // User xác nhận đã nhận hàng khi status = SHIPPING
  const handleConfirmDelivered = async () => {
    if (!token || !order) return;
    if (!confirm('Bạn xác nhận đã nhận được hàng?')) return;
    setConfirming(true);
    try {
      const updated = await orderApi.confirmDelivered(order.orderId, token);
      setOrder(updated);
      setLastUpdated(new Date());
      toast.success('Cảm ơn bạn đã xác nhận nhận hàng!');
    } catch (e: any) { toast.error(e.message); }
    finally { setConfirming(false); }
  };

  const handleSaveAddress = async () => {
    if (!token || !order || !newAddress.trim()) return;
    setSaving(true);
    try {
      const updated = await orderApi.updateOrder(order.orderId, { shippingAddress: newAddress }, token);
      setOrder(updated); setEditAddress(false);
      toast.success('Đã cập nhật địa chỉ!');
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  const handleSavePhone = async () => {
    if (!token || !order || !newPhone.trim()) return;
    setSaving(true);
    try {
      const updated = await orderApi.updateOrder(order.orderId, { phone: newPhone }, token);
      setOrder(updated); setEditPhone(false);
      toast.success('Đã cập nhật số điện thoại!');
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
  if (!order) return null;

  const status = statusConfig[order.status] ?? { label: order.status, className: 'bg-gray-100 text-gray-800', step: 0 };
  const isPending = order.status === 'PENDING';
  const isShipping = order.status === 'SHIPPING';
  const isDelivered = order.status === 'DELIVERED';
  const isCancelled = order.status === 'CANCELLED';

  // Helpers cho review
  const getReviewState = (bookId: number) => reviewStates[bookId] ?? {
    rating: 5, hoverRating: 0, comment: '', submitting: false, done: false,
  };

  const setReviewField = (bookId: number, field: string, value: any) => {
    setReviewStates(prev => ({
      ...prev,
      [bookId]: { ...getReviewState(bookId), [field]: value },
    }));
  };

  const handleSubmitReview = async (bookId: number) => {
    if (!token) return;
    const rs = getReviewState(bookId);
    setReviewField(bookId, 'submitting', true);
    try {
      await reviewApi.createReview({ bookId, rating: rs.rating, comment: rs.comment }, token);
      setReviewedBooks(prev => new Set([...prev, bookId]));
      setReviewField(bookId, 'done', true);
      toast.success('Đánh giá đã được gửi!');
    } catch (e: any) {
      toast.error(e.message || 'Gửi đánh giá thất bại');
    } finally {
      setReviewField(bookId, 'submitting', false);
    }
  };

  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4 max-w-3xl">

        {/* Header */}
        <div className="flex items-center gap-4 mb-2">
          <Link href="/profile?tab=orders">
            <Button variant="ghost" size="icon" className="rounded-full"><ArrowLeft className="h-5 w-5" /></Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Đơn #{String(order.orderId).padStart(6, '0')}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {new Date(order.createdAt).toLocaleDateString('vi-VN', {
                day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
              })}
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span className={cn('text-xs font-medium px-3 py-1 rounded-full', status.className)}>
              {status.label}
            </span>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full"
              onClick={() => fetchOrder(true)} disabled={polling} title="Làm mới">
              <RefreshCw className={cn('h-3.5 w-3.5', polling && 'animate-spin')} />
            </Button>
          </div>
        </div>

        {/* Last updated */}
        {lastUpdated && (
          <p className="text-xs text-muted-foreground text-right mb-4">
            Cập nhật lúc {lastUpdated.toLocaleTimeString('vi-VN')}
            {' · '}
            <span className="text-primary/70">Tự động mỗi 30 giây</span>
          </p>
        )}

        <div className="space-y-4">

          {/* Thanh tiến trình */}
          {!isCancelled && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              className="bg-card rounded-2xl border border-border p-6">
              <div className="relative flex items-start justify-between">
                <div className="absolute top-4 left-8 right-8 h-0.5 bg-border" />
                <div className="absolute top-4 left-8 h-0.5 bg-primary transition-all"
                  style={{ width: status.step > 1 ? `${((status.step - 1) / 4) * 100}%` : '0%' }} />
                {steps.map((step, i) => {
                  const done = status.step > i + 1;
                  const active = status.step === i + 1;
                  return (
                    <div key={step} className="flex flex-col items-center gap-2 z-10 flex-1">
                      <div className={cn(
                        'w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium border-2 bg-background transition-colors',
                        done ? 'bg-primary border-primary' :
                        active ? 'border-primary text-primary' : 'border-border text-muted-foreground'
                      )}>
                        {done ? <Check className="h-3.5 w-3.5 text-white" /> : i + 1}
                      </div>
                      <span className={cn('text-xs text-center leading-tight',
                        active ? 'text-primary font-medium' : 'text-muted-foreground')}>
                        {step}
                      </span>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* Nút xác nhận đã nhận hàng — chỉ hiện khi SHIPPING */}
          {isShipping && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
              <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 flex items-center justify-between gap-4">
                <div>
                  <p className="font-medium text-orange-800 text-sm">Đơn hàng đang được giao đến bạn</p>
                  <p className="text-xs text-orange-600 mt-0.5">Xác nhận khi đã nhận được hàng</p>
                </div>
                <Button className="bg-orange-500 hover:bg-orange-600 text-white rounded-full gap-2 flex-shrink-0"
                  onClick={handleConfirmDelivered} disabled={confirming}>
                  {confirming
                    ? <><Loader2 className="h-4 w-4 animate-spin" />Đang xử lý...</>
                    : <><CheckCircle2 className="h-4 w-4" />Đã nhận hàng</>
                  }
                </Button>
              </div>
            </motion.div>
          )}

          {/* Thông báo hoàn thành */}
          {isDelivered && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
              <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                <div>
                  <p className="font-medium text-green-800 text-sm">Đơn hàng đã hoàn thành</p>
                  <p className="text-xs text-green-600 mt-0.5">Cảm ơn bạn đã mua hàng tại Bookish!</p>
                </div>
              </div>
            </motion.div>
          )}

          {/* Thông tin giao hàng */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
            className="bg-card rounded-2xl border border-border p-6 space-y-4">
            <h2 className="font-semibold text-foreground">Thông tin giao hàng</h2>

            {/* Địa chỉ */}
            <div className="flex items-start gap-3">
              <MapPin className="h-4 w-4 text-primary mt-1 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-xs text-muted-foreground mb-1">Địa chỉ</p>
                {editAddress ? (
                  <div className="flex gap-2">
                    <Input value={newAddress} onChange={(e) => setNewAddress(e.target.value)}
                      className="rounded-xl text-sm h-9" autoFocus />
                    <Button size="icon" className="h-9 w-9 rounded-xl" onClick={handleSaveAddress} disabled={saving}>
                      <Check className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-9 w-9 rounded-xl" onClick={() => setEditAddress(false)}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-foreground flex-1">{order.shippingAddress || 'Chưa có địa chỉ'}</p>
                    {isPending && (
                      <button onClick={() => { setNewAddress(order.shippingAddress || ''); setEditAddress(true); }}>
                        <Pencil className="h-3.5 w-3.5 text-muted-foreground hover:text-primary transition-colors" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* SĐT */}
            <div className="flex items-start gap-3">
              <Phone className="h-4 w-4 text-primary mt-1 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-xs text-muted-foreground mb-1">Số điện thoại</p>
                {editPhone ? (
                  <div className="flex gap-2">
                    <Input value={newPhone} onChange={(e) => setNewPhone(e.target.value)}
                      className="rounded-xl text-sm h-9" autoFocus />
                    <Button size="icon" className="h-9 w-9 rounded-xl" onClick={handleSavePhone} disabled={saving}>
                      <Check className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-9 w-9 rounded-xl" onClick={() => setEditPhone(false)}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-foreground flex-1">{order.phone || 'Chưa có SĐT'}</p>
                    {isPending && (
                      <button onClick={() => { setNewPhone(order.phone || ''); setEditPhone(true); }}>
                        <Pencil className="h-3.5 w-3.5 text-muted-foreground hover:text-primary transition-colors" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* PTTT */}
            <div className="flex items-start gap-3">
              {order.paymentMethod === 'QR_CODE'
                ? <QrCode className="h-4 w-4 text-primary mt-1 flex-shrink-0" />
                : <Banknote className="h-4 w-4 text-primary mt-1 flex-shrink-0" />
              }
              <div>
                <p className="text-xs text-muted-foreground mb-1">Phương thức thanh toán</p>
                <p className="text-sm text-foreground">
                  {order.paymentMethod === 'QR_CODE' ? 'QR Code (Chuyển khoản)' : 'Tiền mặt khi nhận hàng (COD)'}
                </p>
              </div>
            </div>
          </motion.div>

          {/* Sản phẩm */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="bg-card rounded-2xl border border-border p-6">
            <div className="flex items-center gap-2 mb-4">
              <Package className="h-4 w-4 text-primary" />
              <h2 className="font-semibold text-foreground">Sản phẩm ({order.items.length})</h2>
            </div>
            <div className="space-y-4">
              {order.items.map((item) => (
                <div key={item.orderItemId} className="flex gap-3">
                  <Link href={`/book/${item.bookId}`} className="flex-shrink-0">
                    <div className="relative w-14 aspect-[3/4] rounded-lg overflow-hidden bg-muted">
                      <Image src={item.image || 'https://picsum.photos/id/24/400/600'} alt={item.title} fill className="object-cover" />
                    </div>
                  </Link>
                  <div className="flex-1 min-w-0">
                    <Link href={`/book/${item.bookId}`}>
                      <p className="text-sm font-medium text-foreground hover:text-primary line-clamp-2">{item.title}</p>
                    </Link>
                    <p className="text-xs text-muted-foreground mt-1">
                      {item.price.toLocaleString('vi-VN')}đ × {item.quantity}
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-foreground whitespace-nowrap">
                    {item.subtotal.toLocaleString('vi-VN')}đ
                  </p>
                </div>
              ))}
            </div>

            <Separator className="my-4" />

            <div className="space-y-2">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Tạm tính</span>
                <span>{(order.totalPrice - order.shippingFee).toLocaleString('vi-VN')}đ</span>
              </div>
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Phí vận chuyển</span>
                <span>{order.shippingFee === 0 ? 'Miễn phí' : order.shippingFee.toLocaleString('vi-VN') + 'đ'}</span>
              </div>
              <Separator />
              <div className="flex justify-between font-bold text-foreground">
                <span>Tổng cộng</span>
                <span className="text-primary">{order.totalPrice.toLocaleString('vi-VN')}đ</span>
              </div>
            </div>
          </motion.div>

          {/* Hủy đơn */}
          {isPending && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
              <Button variant="outline"
                className="w-full rounded-full border-destructive text-destructive hover:bg-destructive hover:text-white"
                onClick={handleCancel} disabled={cancelling}>
                {cancelling
                  ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Đang hủy...</>
                  : 'Hủy đơn hàng'
                }
              </Button>
            </motion.div>
          )}

          {/* Đánh giá sách sau khi DELIVERED */}
          {isDelivered && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
              className="space-y-4">
              <h2 className="font-bold text-lg text-foreground">Đánh giá sản phẩm</h2>
              {order.items.map((item) => {
                const rs = getReviewState(item.bookId);
                const isDone = rs.done || reviewedBooks.has(item.bookId);
                return (
                  <div key={item.bookId} className="bg-card border border-border rounded-2xl p-5">
                    {/* Tên sách */}
                    <div className="flex items-center gap-3 mb-4">
                      <div className="relative h-12 w-9 rounded overflow-hidden flex-shrink-0">
                        <Image src={item.image || 'https://picsum.photos/id/24/400/600'}
                          alt={item.title} fill className="object-cover" />
                      </div>
                      <p className="font-medium text-sm text-foreground line-clamp-2">{item.title}</p>
                    </div>

                    {isDone ? (
                      <div className="flex items-center gap-2 text-green-600 text-sm font-medium">
                        <CheckCircle2 className="h-4 w-4" />
                        Cảm ơn bạn đã đánh giá!
                      </div>
                    ) : (
                      <>
                        {/* Chọn sao */}
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-sm text-muted-foreground">Xếp hạng:</span>
                          <div className="flex gap-1">
                            {[1, 2, 3, 4, 5].map((i) => (
                              <button key={i}
                                onClick={() => setReviewField(item.bookId, 'rating', i)}
                                onMouseEnter={() => setReviewField(item.bookId, 'hoverRating', i)}
                                onMouseLeave={() => setReviewField(item.bookId, 'hoverRating', 0)}
                                className="transition-transform hover:scale-110">
                                <Star className={`h-6 w-6 transition-colors ${
                                  i <= (rs.hoverRating || rs.rating)
                                    ? 'fill-amber-400 text-amber-400'
                                    : 'text-muted-foreground/30'
                                }`} />
                              </button>
                            ))}
                          </div>
                          <span className="text-xs text-muted-foreground ml-1">
                            {['','Tệ','Không hay','Bình thường','Hay','Tuyệt vời'][rs.hoverRating || rs.rating]}
                          </span>
                        </div>

                        {/* Bình luận */}
                        <textarea
                          value={rs.comment}
                          onChange={(e) => setReviewField(item.bookId, 'comment', e.target.value)}
                          placeholder="Chia sẻ cảm nhận của bạn..."
                          rows={3}
                          className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary mb-3"
                        />

                        <div className="flex justify-end">
                          <Button size="sm" onClick={() => handleSubmitReview(item.bookId)}
                            disabled={rs.submitting}
                            className="bg-primary hover:bg-primary/90 rounded-full px-5">
                            {rs.submitting ? <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />Đang gửi...</> : 'Gửi đánh giá'}
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}