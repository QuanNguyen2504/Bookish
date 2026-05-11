'use client';

import { use, useEffect, useState, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ArrowLeft, MapPin, Phone, Package, Loader2,
  Pencil, X, Check, Banknote, QrCode, RefreshCw, CheckCircle2, Star,
  RotateCcw, Upload, AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useAuthStore } from '@/lib/store/auth-store';
import { orderApi, OrderResponse } from '@/lib/api/order-api';
import { reviewApi } from '@/lib/api/review-api';
import {
  returnApi, ReturnRequestResponse, ReturnReason,
  REASON_LABELS, STATUS_LABELS,
} from '@/lib/api/return-api';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// ── Design tokens (đồng bộ với trang chủ) ──────────────────────────────────
const T = {
  bg: '#f5f5f7',
  card: '#ffffff',
  border: '1px solid #d2d2d7',
  text: '#1d1d1f',
  sub: '#6e6e73',
  accent: '#0071e3',
  accentHover: 'rgba(0,113,227,0.08)',
};

// ── Helpers ─────────────────────────────────────────────────────────────────
const statusConfig: Record<string, { label: string; color: string; bg: string; step: number }> = {
  PENDING:    { label: 'Chờ xác nhận', color: '#92400e', bg: '#fef3c7', step: 1 },
  CONFIRMED:  { label: 'Đã xác nhận',  color: '#1e40af', bg: '#dbeafe', step: 2 },
  PROCESSING: { label: 'Đang xử lý',   color: '#6b21a8', bg: '#f3e8ff', step: 3 },
  SHIPPING:   { label: 'Đang giao',    color: '#9a3412', bg: '#ffedd5', step: 4 },
  DELIVERED:  { label: 'Đã giao',      color: '#166534', bg: '#dcfce7', step: 5 },
  CANCELLED:  { label: 'Đã hủy',       color: '#991b1b', bg: '#fee2e2', step: 0 },
};

const steps = ['Chờ xác nhận', 'Đã xác nhận', 'Đang xử lý', 'Đang giao', 'Đã giao'];
const POLL_INTERVAL = 30000;

// ── Sub-components ───────────────────────────────────────────────────────────

/** Card wrapper khớp với trang chủ */
function Card({ children, className = '', delay = 0 }: {
  children: React.ReactNode; className?: string; delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay }}
      className={cn('rounded-3xl px-8 py-7', className)}
      style={{ background: T.card, border: T.border }}
    >
      {children}
    </motion.div>
  );
}

/** Label phụ màu accent — kiểu trang chủ */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold tracking-widest uppercase mb-1"
      style={{ color: T.accent }}>
      {children}
    </p>
  );
}

/** Divider */
function Divider() {
  return <div style={{ height: 1, background: '#d2d2d7', margin: '16px 0' }} />;
}

// ── Main page ────────────────────────────────────────────────────────────────
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

  const [reviewStates, setReviewStates] = useState<Record<number, {
    rating: number; hoverRating: number; comment: string; submitting: boolean; done: boolean;
  }>>({});
  const [reviewedBooks, setReviewedBooks] = useState<Set<number>>(new Set());

  const [existingReturn, setExistingReturn] = useState<ReturnRequestResponse | null>(null);
  const [returnDialogOpen, setReturnDialogOpen] = useState(false);
  const [bankDialogOpen, setBankDialogOpen] = useState(false);
  const [returnForm, setReturnForm] = useState<{
    reason: ReturnReason; description: string; imageUrl: string;
  }>({ reason: 'BROKEN', description: '', imageUrl: '' });
  const [bankForm, setBankForm] = useState({ bankAccount: '', bankName: '', accountHolder: '' });
  const [uploadingImage, setUploadingImage] = useState(false);
  const [submittingReturn, setSubmittingReturn] = useState(false);
  const [submittingBank, setSubmittingBank] = useState(false);

  const fetchOrder = useCallback(async (silent = false) => {
    if (!token || !id) return;
    if (!silent) setLoading(true); else setPolling(true);
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
      if (!silent) { toast.error('Không tìm thấy đơn hàng'); router.push('/profile?tab=orders'); }
    } finally { setLoading(false); setPolling(false); }
  }, [token, id, router]);

  useEffect(() => { fetchOrder(false); }, [fetchOrder]);
  useEffect(() => {
    const interval = setInterval(() => fetchOrder(true), POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchOrder]);

  const fetchReturn = useCallback(async () => {
    if (!token || !order) return;
    try {
      const all = await returnApi.getMyRequests(token);
      const found = all.find(r => r.orderId === order.orderId);
      setExistingReturn(found || null);
      if (found) setBankForm({ bankAccount: found.bankAccount || '', bankName: found.bankName || '', accountHolder: found.accountHolder || '' });
    } catch { /* ignore */ }
  }, [token, order]);

  useEffect(() => {
    if (order?.status === 'DELIVERED') fetchReturn();
  }, [order?.status, fetchReturn]);

  const handleCancel = async () => {
    if (!token || !order) return;
    if (!confirm('Bạn có chắc muốn hủy đơn hàng này không?')) return;
    setCancelling(true);
    try {
      const updated = await orderApi.cancelOrder(order.orderId, token);
      setOrder(updated); setLastUpdated(new Date());
      toast.success('Đã hủy đơn hàng!');
    } catch (e: any) { toast.error(e.message); }
    finally { setCancelling(false); }
  };

  const handleConfirmDelivered = async () => {
    if (!token || !order) return;
    if (!confirm('Bạn xác nhận đã nhận được hàng?')) return;
    setConfirming(true);
    try {
      const updated = await orderApi.confirmDelivered(order.orderId, token);
      setOrder(updated); setLastUpdated(new Date());
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

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

  const handleUploadImage = async (file: File) => {
    if (!token) return;
    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`${API_BASE}/upload/image`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Upload thất bại');
      setReturnForm(prev => ({ ...prev, imageUrl: data.url }));
      toast.success('Đã tải ảnh lên');
    } catch (e: any) { toast.error(e.message); }
    finally { setUploadingImage(false); }
  };

  const handleSubmitReturn = async () => {
    if (!token || !order) return;
    setSubmittingReturn(true);
    try {
      const created = await returnApi.create({
        orderId: order.orderId,
        reason: returnForm.reason,
        description: returnForm.description || undefined,
        imageUrl: returnForm.imageUrl || undefined,
      }, token);
      setExistingReturn(created);
      setReturnDialogOpen(false);
      setReturnForm({ reason: 'BROKEN', description: '', imageUrl: '' });
      toast.success('Đã gửi yêu cầu hoàn trả. Chờ admin duyệt.');
    } catch (e: any) { toast.error(e.message); }
    finally { setSubmittingReturn(false); }
  };

  const handleSubmitBankInfo = async () => {
    if (!token || !existingReturn) return;
    if (!bankForm.bankAccount.trim() || !bankForm.bankName.trim() || !bankForm.accountHolder.trim()) {
      toast.error('Vui lòng điền đầy đủ thông tin'); return;
    }
    setSubmittingBank(true);
    try {
      const updated = await returnApi.updateBankInfo(existingReturn.returnId, bankForm, token);
      setExistingReturn(updated); setBankDialogOpen(false);
      toast.success('Đã lưu thông tin ngân hàng');
    } catch (e: any) { toast.error(e.message); }
    finally { setSubmittingBank(false); }
  };

  const handleCancelReturn = async () => {
    if (!token || !existingReturn) return;
    if (!confirm('Bạn có chắc muốn hủy yêu cầu hoàn trả này?')) return;
    try {
      const updated = await returnApi.cancel(existingReturn.returnId, token);
      setExistingReturn(updated);
      toast.success('Đã hủy yêu cầu hoàn trả');
    } catch (e: any) { toast.error(e.message); }
  };

  // ── Loading / empty ────────────────────────────────────────────────────────
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: T.bg }}>
      <Loader2 className="h-8 w-8 animate-spin" style={{ color: T.accent }} />
    </div>
  );
  if (!order) return null;

  const status = statusConfig[order.status] ?? { label: order.status, color: '#6e6e73', bg: '#f5f5f7', step: 0 };
  const isPending   = order.status === 'PENDING';
  const isShipping  = order.status === 'SHIPPING';
  const isDelivered = order.status === 'DELIVERED';
  const isCancelled = order.status === 'CANCELLED';

  const daysSinceDelivered = Math.floor(
    (Date.now() - new Date(order.createdAt).getTime()) / (1000 * 60 * 60 * 24)
  );
  const canRequestReturn = isDelivered && daysSinceDelivered <= 7 && !existingReturn;
  const daysLeft = Math.max(0, 7 - daysSinceDelivered);

  const getReviewState = (bookId: number) => reviewStates[bookId] ?? {
    rating: 5, hoverRating: 0, comment: '', submitting: false, done: false,
  };
  const setReviewField = (bookId: number, field: string, value: any) => {
    setReviewStates(prev => ({ ...prev, [bookId]: { ...getReviewState(bookId), [field]: value } }));
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
    } catch (e: any) { toast.error(e.message || 'Gửi đánh giá thất bại'); }
    finally { setReviewField(bookId, 'submitting', false); }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ background: T.bg, minHeight: '100vh' }}>
      <div className="max-w-3xl mx-auto px-6 py-10">

        {/* ── Header ── */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-6"
        >
          <div className="flex items-center gap-3 mb-4">
            <Link href="/profile?tab=orders">
              <button
                className="flex items-center justify-center h-9 w-9 rounded-full transition-all"
                style={{ background: T.card, border: T.border }}
                onMouseEnter={e => (e.currentTarget.style.background = '#e8e8ed')}
                onMouseLeave={e => (e.currentTarget.style.background = T.card)}
              >
                <ArrowLeft className="h-4 w-4" style={{ color: T.text }} />
              </button>
            </Link>
            <div className="flex-1">
              <SectionLabel>Chi tiết đơn hàng</SectionLabel>
              <h1 className="font-bold tracking-[-0.03em] leading-tight"
                style={{ fontSize: 'clamp(22px, 3vw, 32px)', color: T.text }}>
                Đơn #{String(order.orderId).padStart(6, '0')}
              </h1>
              <p className="text-[13px] mt-0.5" style={{ color: T.sub }}>
                {new Date(order.createdAt).toLocaleDateString('vi-VN', {
                  day: '2-digit', month: '2-digit', year: 'numeric',
                  hour: '2-digit', minute: '2-digit',
                })}
              </p>
            </div>

            {/* Badge trạng thái */}
            <div className="flex items-center gap-2">
              <span
                className="text-[12px] font-semibold px-3 py-1.5 rounded-full"
                style={{ color: status.color, background: status.bg }}
              >
                {status.label}
              </span>
              <button
                onClick={() => fetchOrder(true)}
                disabled={polling}
                title="Làm mới"
                className="flex items-center justify-center h-8 w-8 rounded-full transition-all"
                style={{ background: T.card, border: T.border }}
                onMouseEnter={e => (e.currentTarget.style.background = '#e8e8ed')}
                onMouseLeave={e => (e.currentTarget.style.background = T.card)}
              >
                <RefreshCw className={cn('h-3.5 w-3.5', polling && 'animate-spin')}
                  style={{ color: T.sub }} />
              </button>
            </div>
          </div>

          {lastUpdated && (
            <p className="text-[12px] text-right" style={{ color: T.sub }}>
              Cập nhật lúc {lastUpdated.toLocaleTimeString('vi-VN')}
              {' · '}
              <span style={{ color: T.accent }}>Tự động mỗi 30 giây</span>
            </p>
          )}
        </motion.div>

        <div className="space-y-4">

          {/* ── Thanh tiến trình ── */}
          {!isCancelled && (
            <Card delay={0}>
              <SectionLabel>Tiến trình đơn hàng</SectionLabel>
              <div className="relative flex items-start justify-between mt-5">
                {/* Track nền */}
                <div className="absolute top-4 left-8 right-8 h-0.5" style={{ background: '#d2d2d7' }} />
                {/* Track active */}
                <div
                  className="absolute top-4 left-8 h-0.5 transition-all"
                  style={{
                    width: status.step > 1 ? `${((status.step - 1) / 4) * 100}%` : '0%',
                    background: T.accent,
                  }}
                />
                {steps.map((step, i) => {
                  const done   = status.step > i + 1;
                  const active = status.step === i + 1;
                  return (
                    <div key={step} className="flex flex-col items-center gap-2 z-10 flex-1">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold border-2 transition-colors"
                        style={{
                          background: done ? T.accent : T.card,
                          borderColor: done || active ? T.accent : '#d2d2d7',
                          color: done ? '#fff' : active ? T.accent : T.sub,
                        }}
                      >
                        {done ? <Check className="h-3.5 w-3.5 text-white" /> : i + 1}
                      </div>
                      <span
                        className="text-[11px] text-center leading-tight font-medium"
                        style={{ color: active ? T.accent : T.sub }}
                      >
                        {step}
                      </span>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {/* ── Banner: Đang giao ── */}
          {isShipping && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
              <div
                className="rounded-3xl px-8 py-5 flex items-center justify-between gap-4"
                style={{ background: '#fff7ed', border: '1px solid #fed7aa' }}
              >
                <div>
                  <p className="font-semibold text-[14px]" style={{ color: '#9a3412' }}>
                    Đơn hàng đang được giao đến bạn
                  </p>
                  <p className="text-[13px] mt-0.5" style={{ color: '#c2410c' }}>
                    Xác nhận khi đã nhận được hàng
                  </p>
                </div>
                <button
                  onClick={handleConfirmDelivered}
                  disabled={confirming}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-[13px] font-semibold text-white transition-opacity flex-shrink-0"
                  style={{ background: '#ea580c' }}
                  onMouseEnter={e => (e.currentTarget.style.opacity = '0.88')}
                  onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                >
                  {confirming
                    ? <><Loader2 className="h-4 w-4 animate-spin" />Đang xử lý...</>
                    : <><CheckCircle2 className="h-4 w-4" />Đã nhận hàng</>
                  }
                </button>
              </div>
            </motion.div>
          )}

          {/* ── Banner: Đã giao ── */}
          {isDelivered && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
              <div
                className="rounded-3xl px-8 py-5 flex items-center gap-3"
                style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}
              >
                <CheckCircle2 className="h-5 w-5 flex-shrink-0" style={{ color: '#16a34a' }} />
                <div>
                  <p className="font-semibold text-[14px]" style={{ color: '#166534' }}>
                    Đơn hàng đã hoàn thành
                  </p>
                  <p className="text-[13px] mt-0.5" style={{ color: '#15803d' }}>
                    Cảm ơn bạn đã mua hàng tại Bookish!
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {/* ── Hoàn trả ── */}
          {isDelivered && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
              {existingReturn ? (
                <Card>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <SectionLabel>Yêu cầu hoàn trả</SectionLabel>
                      <h3 className="font-semibold text-[15px]" style={{ color: T.text }}>
                        #{String(existingReturn.returnId).padStart(4, '0')}
                      </h3>
                    </div>
                    <span
                      className="text-[12px] font-semibold px-3 py-1 rounded-full"
                      style={{
                        color: existingReturn.status === 'REQUESTED'  ? '#92400e'
                             : existingReturn.status === 'APPROVED'   ? '#1e40af'
                             : existingReturn.status === 'REJECTED'   ? '#991b1b'
                             : existingReturn.status === 'RETURNED'   ? '#6b21a8'
                             : existingReturn.status === 'REFUNDED'   ? '#166534'
                             : '#374151',
                        background: existingReturn.status === 'REQUESTED'  ? '#fef3c7'
                                  : existingReturn.status === 'APPROVED'   ? '#dbeafe'
                                  : existingReturn.status === 'REJECTED'   ? '#fee2e2'
                                  : existingReturn.status === 'RETURNED'   ? '#f3e8ff'
                                  : existingReturn.status === 'REFUNDED'   ? '#dcfce7'
                                  : '#f3f4f6',
                      }}
                    >
                      {STATUS_LABELS[existingReturn.status]}
                    </span>
                  </div>

                  <div className="space-y-1.5 text-[14px]">
                    <p style={{ color: T.text }}>
                      <span style={{ color: T.sub }}>Lý do: </span>
                      {REASON_LABELS[existingReturn.reason]}
                    </p>
                    {existingReturn.description && (
                      <p className="text-[13px]" style={{ color: T.sub }}>{existingReturn.description}</p>
                    )}
                    <p style={{ color: T.text }}>
                      <span style={{ color: T.sub }}>Số tiền hoàn: </span>
                      <span className="font-semibold" style={{ color: T.accent }}>
                        {existingReturn.refundAmount.toLocaleString('vi-VN')}đ
                      </span>
                    </p>
                  </div>

                  {existingReturn.adminNote && (
                    <div className="mt-4 rounded-2xl p-4" style={{ background: T.bg }}>
                      <p className="text-[11px] font-semibold uppercase tracking-widest mb-1" style={{ color: T.sub }}>
                        Ghi chú từ admin
                      </p>
                      <p className="text-[14px]" style={{ color: T.text }}>{existingReturn.adminNote}</p>
                    </div>
                  )}

                  {(existingReturn.status === 'APPROVED' || existingReturn.status === 'RETURNED') && (
                    <>
                      {existingReturn.bankAccount ? (
                        <div className="mt-4 rounded-2xl p-4" style={{ background: T.bg }}>
                          <p className="text-[11px] font-semibold uppercase tracking-widest mb-2" style={{ color: T.sub }}>
                            Thông tin nhận hoàn tiền
                          </p>
                          <p className="text-[14px]" style={{ color: T.text }}>
                            {existingReturn.bankName} · {existingReturn.bankAccount}
                          </p>
                          <p className="text-[13px]" style={{ color: T.sub }}>{existingReturn.accountHolder}</p>
                          <button
                            onClick={() => setBankDialogOpen(true)}
                            className="text-[13px] mt-2 transition-opacity"
                            style={{ color: T.accent }}
                            onMouseEnter={e => (e.currentTarget.style.opacity = '0.7')}
                            onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                          >
                            Chỉnh sửa
                          </button>
                        </div>
                      ) : (
                        <div className="mt-4 rounded-2xl p-4 flex items-start gap-3"
                          style={{ background: '#fff7ed', border: '1px solid #fed7aa' }}>
                          <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" style={{ color: '#c2410c' }} />
                          <div className="flex-1">
                            <p className="font-semibold text-[14px]" style={{ color: '#9a3412' }}>
                              Cần cung cấp thông tin ngân hàng
                            </p>
                            <p className="text-[13px] mt-0.5" style={{ color: '#c2410c' }}>
                              Vui lòng nhập STK để nhận tiền hoàn
                            </p>
                          </div>
                          <button
                            onClick={() => setBankDialogOpen(true)}
                            className="px-4 py-2 rounded-full text-[13px] font-medium text-white flex-shrink-0"
                            style={{ background: '#ea580c' }}
                          >
                            Nhập STK
                          </button>
                        </div>
                      )}
                    </>
                  )}

                  {existingReturn.status === 'REQUESTED' && (
                    <button
                      onClick={handleCancelReturn}
                      className="mt-4 w-full py-2.5 rounded-full text-[14px] font-medium transition-all"
                      style={{ color: '#dc2626', border: '1.5px solid #dc2626', background: 'transparent' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#dc2626'; (e.currentTarget as HTMLElement).style.color = '#fff'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = '#dc2626'; }}
                    >
                      Hủy yêu cầu
                    </button>
                  )}
                </Card>
              ) : canRequestReturn ? (
                <Card>
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <SectionLabel>Hoàn trả</SectionLabel>
                      <h3 className="font-semibold text-[15px]" style={{ color: T.text }}>
                        Gặp vấn đề với đơn hàng?
                      </h3>
                      <p className="text-[13px] mt-0.5" style={{ color: T.sub }}>
                        Bạn còn {daysLeft} ngày để yêu cầu hoàn trả
                      </p>
                    </div>
                    <button
                      onClick={() => setReturnDialogOpen(true)}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-[13px] font-medium flex-shrink-0 transition-all"
                      style={{ color: T.accent, border: `1.5px solid ${T.accent}`, background: 'transparent' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = T.accent; (e.currentTarget as HTMLElement).style.color = '#fff'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = T.accent; }}
                    >
                      <RotateCcw className="h-4 w-4" />
                      Yêu cầu hoàn trả
                    </button>
                  </div>
                </Card>
              ) : daysSinceDelivered > 7 ? (
                <p className="text-[13px] text-center py-2" style={{ color: T.sub }}>
                  Đã quá 7 ngày — không thể yêu cầu hoàn trả
                </p>
              ) : null}
            </motion.div>
          )}

          {/* ── Thông tin giao hàng ── */}
          <Card delay={0.1}>
            <SectionLabel>Thông tin giao hàng</SectionLabel>
            <h2 className="font-semibold text-[17px] mb-5" style={{ color: T.text }}>
              Địa chỉ & liên hệ
            </h2>

            {/* Địa chỉ */}
            <div className="flex items-start gap-3 mb-4">
              <div className="h-8 w-8 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: T.accentHover }}>
                <MapPin className="h-4 w-4" style={{ color: T.accent }} />
              </div>
              <div className="flex-1">
                <p className="text-[11px] font-semibold uppercase tracking-widest mb-1" style={{ color: T.sub }}>
                  Địa chỉ
                </p>
                {editAddress ? (
                  <div className="flex gap-2">
                    <input
                      value={newAddress}
                      onChange={e => setNewAddress(e.target.value)}
                      autoFocus
                      className="flex-1 px-4 py-2 rounded-xl text-[14px] outline-none"
                      style={{ background: T.bg, border: T.border, color: T.text }}
                    />
                    <button onClick={handleSaveAddress} disabled={saving}
                      className="h-9 w-9 rounded-xl flex items-center justify-center text-white"
                      style={{ background: T.accent }}>
                      <Check className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => setEditAddress(false)}
                      className="h-9 w-9 rounded-xl flex items-center justify-center"
                      style={{ background: T.bg, border: T.border }}>
                      <X className="h-3.5 w-3.5" style={{ color: T.sub }} />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <p className="text-[14px] flex-1" style={{ color: T.text }}>
                      {order.shippingAddress || 'Chưa có địa chỉ'}
                    </p>
                    {isPending && (
                      <button onClick={() => { setNewAddress(order.shippingAddress || ''); setEditAddress(true); }}>
                        <Pencil className="h-3.5 w-3.5 transition-colors"
                          style={{ color: T.sub }}
                          onMouseEnter={e => (e.currentTarget.style.color = T.accent)}
                          onMouseLeave={e => (e.currentTarget.style.color = T.sub)}
                        />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            <Divider />

            {/* SĐT */}
            <div className="flex items-start gap-3 mb-4">
              <div className="h-8 w-8 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: T.accentHover }}>
                <Phone className="h-4 w-4" style={{ color: T.accent }} />
              </div>
              <div className="flex-1">
                <p className="text-[11px] font-semibold uppercase tracking-widest mb-1" style={{ color: T.sub }}>
                  Số điện thoại
                </p>
                {editPhone ? (
                  <div className="flex gap-2">
                    <input
                      value={newPhone}
                      onChange={e => setNewPhone(e.target.value)}
                      autoFocus
                      className="flex-1 px-4 py-2 rounded-xl text-[14px] outline-none"
                      style={{ background: T.bg, border: T.border, color: T.text }}
                    />
                    <button onClick={handleSavePhone} disabled={saving}
                      className="h-9 w-9 rounded-xl flex items-center justify-center text-white"
                      style={{ background: T.accent }}>
                      <Check className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => setEditPhone(false)}
                      className="h-9 w-9 rounded-xl flex items-center justify-center"
                      style={{ background: T.bg, border: T.border }}>
                      <X className="h-3.5 w-3.5" style={{ color: T.sub }} />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <p className="text-[14px] flex-1" style={{ color: T.text }}>
                      {order.phone || 'Chưa có SĐT'}
                    </p>
                    {isPending && (
                      <button onClick={() => { setNewPhone(order.phone || ''); setEditPhone(true); }}>
                        <Pencil className="h-3.5 w-3.5 transition-colors"
                          style={{ color: T.sub }}
                          onMouseEnter={e => (e.currentTarget.style.color = T.accent)}
                          onMouseLeave={e => (e.currentTarget.style.color = T.sub)}
                        />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            <Divider />

            {/* Phương thức TT */}
            <div className="flex items-start gap-3">
              <div className="h-8 w-8 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: T.accentHover }}>
                {order.paymentMethod === 'QR_CODE'
                  ? <QrCode className="h-4 w-4" style={{ color: T.accent }} />
                  : <Banknote className="h-4 w-4" style={{ color: T.accent }} />
                }
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-widest mb-1" style={{ color: T.sub }}>
                  Phương thức thanh toán
                </p>
                <p className="text-[14px]" style={{ color: T.text }}>
                  {order.paymentMethod === 'QR_CODE'
                    ? 'QR Code (Chuyển khoản)'
                    : 'Tiền mặt khi nhận hàng (COD)'}
                </p>
              </div>
            </div>
          </Card>

          {/* ── Sản phẩm ── */}
          <Card delay={0.12}>
            <div className="flex items-center gap-2 mb-5">
              <div className="h-8 w-8 rounded-xl flex items-center justify-center"
                style={{ background: T.accentHover }}>
                <Package className="h-4 w-4" style={{ color: T.accent }} />
              </div>
              <div>
                <SectionLabel>Đơn hàng</SectionLabel>
                <h2 className="font-semibold text-[17px]" style={{ color: T.text }}>
                  Sản phẩm ({order.items.length})
                </h2>
              </div>
            </div>

            <div className="space-y-4">
              {order.items.map((item, idx) => (
                <div key={item.orderItemId}>
                  <div className="flex gap-4">
                    <Link href={`/book/${item.bookId}`} className="flex-shrink-0">
                      <div className="relative w-14 rounded-xl overflow-hidden"
                        style={{ aspectRatio: '3/4', background: T.bg }}>
                        <Image
                          src={item.image || 'https://picsum.photos/id/24/400/600'}
                          alt={item.title} fill className="object-cover"
                        />
                      </div>
                    </Link>
                    <div className="flex-1 min-w-0">
                      <Link href={`/book/${item.bookId}`}>
                        <p className="text-[14px] font-medium line-clamp-2 transition-colors"
                          style={{ color: T.text }}
                          onMouseEnter={e => (e.currentTarget.style.color = T.accent)}
                          onMouseLeave={e => (e.currentTarget.style.color = T.text)}
                        >
                          {item.title}
                        </p>
                      </Link>
                      <p className="text-[13px] mt-1" style={{ color: T.sub }}>
                        {item.price.toLocaleString('vi-VN')}đ × {item.quantity}
                      </p>
                    </div>
                    <p className="text-[14px] font-semibold whitespace-nowrap" style={{ color: T.text }}>
                      {item.subtotal.toLocaleString('vi-VN')}đ
                    </p>
                  </div>
                  {idx < order.items.length - 1 && <Divider />}
                </div>
              ))}
            </div>

            <Divider />

            <div className="space-y-2">
              <div className="flex justify-between text-[14px]" style={{ color: T.sub }}>
                <span>Tạm tính</span>
                <span>{(order.totalPrice - order.shippingFee).toLocaleString('vi-VN')}đ</span>
              </div>
              <div className="flex justify-between text-[14px]" style={{ color: T.sub }}>
                <span>Phí vận chuyển</span>
                <span>{order.shippingFee === 0 ? 'Miễn phí' : order.shippingFee.toLocaleString('vi-VN') + 'đ'}</span>
              </div>
              <Divider />
              <div className="flex justify-between text-[16px] font-bold" style={{ color: T.text }}>
                <span>Tổng cộng</span>
                <span style={{ color: T.accent }}>{order.totalPrice.toLocaleString('vi-VN')}đ</span>
              </div>
            </div>
          </Card>

          {/* ── Hủy đơn ── */}
          {isPending && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
              <button
                onClick={handleCancel}
                disabled={cancelling}
                className="w-full py-3 rounded-full text-[15px] font-medium transition-all"
                style={{ color: '#dc2626', border: '1.5px solid #dc2626', background: 'transparent' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#dc2626'; (e.currentTarget as HTMLElement).style.color = '#fff'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = '#dc2626'; }}
              >
                {cancelling
                  ? <span className="inline-flex items-center gap-2 justify-center">
                      <Loader2 className="h-4 w-4 animate-spin" />Đang hủy...
                    </span>
                  : 'Hủy đơn hàng'
                }
              </button>
            </motion.div>
          )}

          {/* ── Đánh giá sản phẩm ── */}
          {isDelivered && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.18 }}
              className="space-y-3"
            >
              <div className="px-2">
                <SectionLabel>Sau khi nhận hàng</SectionLabel>
                <h2 className="font-bold text-[20px] tracking-[-0.02em]" style={{ color: T.text }}>
                  Đánh giá sản phẩm
                </h2>
              </div>

              {order.items.map((item) => {
                const rs = getReviewState(item.bookId);
                const isDone = rs.done || reviewedBooks.has(item.bookId);
                return (
                  <div
                    key={item.bookId}
                    className="rounded-3xl px-8 py-6"
                    style={{ background: T.card, border: T.border }}
                  >
                    <div className="flex items-center gap-3 mb-5">
                      <div className="relative h-12 w-9 rounded-xl overflow-hidden flex-shrink-0">
                        <Image
                          src={item.image || 'https://picsum.photos/id/24/400/600'}
                          alt={item.title} fill className="object-cover"
                        />
                      </div>
                      <p className="font-semibold text-[14px] line-clamp-2" style={{ color: T.text }}>
                        {item.title}
                      </p>
                    </div>

                    {isDone ? (
                      <div className="flex items-center gap-2 text-[14px] font-medium"
                        style={{ color: '#16a34a' }}>
                        <CheckCircle2 className="h-4 w-4" />
                        Cảm ơn bạn đã đánh giá!
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-2 mb-4">
                          <span className="text-[13px]" style={{ color: T.sub }}>Xếp hạng:</span>
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
                                    : 'text-gray-300'
                                }`} />
                              </button>
                            ))}
                          </div>
                          <span className="text-[12px]" style={{ color: T.sub }}>
                            {['','Tệ','Không hay','Bình thường','Hay','Tuyệt vời'][rs.hoverRating || rs.rating]}
                          </span>
                        </div>

                        <textarea
                          value={rs.comment}
                          onChange={(e) => setReviewField(item.bookId, 'comment', e.target.value)}
                          placeholder="Chia sẻ cảm nhận của bạn..."
                          rows={3}
                          className="w-full px-4 py-3 rounded-2xl text-[14px] resize-none outline-none mb-4"
                          style={{
                            background: T.bg,
                            border: T.border,
                            color: T.text,
                          }}
                        />

                        <div className="flex justify-end">
                          <button
                            onClick={() => handleSubmitReview(item.bookId)}
                            disabled={rs.submitting}
                            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full text-[13px] font-medium text-white transition-opacity"
                            style={{ background: T.accent }}
                            onMouseEnter={e => (e.currentTarget.style.opacity = '0.88')}
                            onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                          >
                            {rs.submitting
                              ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Đang gửi...</>
                              : 'Gửi đánh giá'
                            }
                          </button>
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

      {/* ── Dialog: Yêu cầu hoàn trả ── */}
      <Dialog open={returnDialogOpen} onOpenChange={setReturnDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle style={{ color: T.text }}>Yêu cầu hoàn trả</DialogTitle>
            <DialogDescription style={{ color: T.sub }}>
              Vui lòng cung cấp thông tin để chúng tôi xử lý yêu cầu
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            <div>
              <label className="text-[13px] font-semibold uppercase tracking-widest mb-2 block"
                style={{ color: T.sub }}>
                Lý do hoàn trả
              </label>
              <Select value={returnForm.reason}
                onValueChange={(v) => setReturnForm(prev => ({ ...prev, reason: v as ReturnReason }))}>
                <SelectTrigger className="rounded-2xl" style={{ border: T.border }}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(REASON_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {returnForm.reason === 'CHANGE_MIND' && (
                <p className="text-[12px] mt-1.5" style={{ color: '#92400e' }}>
                  Lưu ý: lý do "đổi ý" sẽ bị trừ phí vận chuyển
                </p>
              )}
            </div>

            <div>
              <label className="text-[13px] font-semibold uppercase tracking-widest mb-2 block"
                style={{ color: T.sub }}>
                Mô tả chi tiết (không bắt buộc)
              </label>
              <textarea
                value={returnForm.description}
                onChange={(e) => setReturnForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Mô tả vấn đề bạn gặp phải..."
                rows={3}
                className="w-full px-4 py-3 rounded-2xl text-[14px] resize-none outline-none"
                style={{ background: T.bg, border: T.border, color: T.text }}
              />
            </div>

            <div>
              <label className="text-[13px] font-semibold uppercase tracking-widest mb-2 block"
                style={{ color: T.sub }}>
                Ảnh minh chứng (không bắt buộc)
              </label>
              {returnForm.imageUrl ? (
                <div className="relative">
                  <Image src={returnForm.imageUrl} alt="Ảnh"
                    width={400} height={200}
                    className="w-full h-40 object-contain rounded-2xl"
                    style={{ border: T.border }} />
                  <button
                    onClick={() => setReturnForm(prev => ({ ...prev, imageUrl: '' }))}
                    className="absolute top-2 right-2 bg-white rounded-full p-1 shadow-md">
                    <X className="h-4 w-4" style={{ color: '#dc2626' }} />
                  </button>
                </div>
              ) : (
                <label
                  className="flex items-center justify-center gap-2 w-full py-6 rounded-2xl cursor-pointer transition-colors"
                  style={{ border: '2px dashed #d2d2d7', background: 'transparent' }}
                  onMouseEnter={e => (e.currentTarget.style.background = T.bg)}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  {uploadingImage
                    ? <><Loader2 className="h-4 w-4 animate-spin" style={{ color: T.sub }} />
                        <span className="text-[14px]" style={{ color: T.sub }}>Đang tải lên...</span></>
                    : <><Upload className="h-4 w-4" style={{ color: T.sub }} />
                        <span className="text-[14px]" style={{ color: T.sub }}>Chọn ảnh</span></>
                  }
                  <input type="file" accept="image/*" className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUploadImage(f); }}
                    disabled={uploadingImage} />
                </label>
              )}
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setReturnDialogOpen(false)}
                className="flex-1 py-3 rounded-full text-[14px] font-medium transition-all"
                style={{ color: T.text, border: T.border, background: 'transparent' }}
                onMouseEnter={e => (e.currentTarget.style.background = T.bg)}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                Hủy
              </button>
              <button
                onClick={handleSubmitReturn}
                disabled={submittingReturn}
                className="flex-1 py-3 rounded-full text-[14px] font-medium text-white transition-opacity"
                style={{ background: T.accent }}
                onMouseEnter={e => (e.currentTarget.style.opacity = '0.88')}
                onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
              >
                {submittingReturn
                  ? <span className="inline-flex items-center gap-2 justify-center">
                      <Loader2 className="h-4 w-4 animate-spin" />Đang gửi...
                    </span>
                  : 'Gửi yêu cầu'
                }
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Thông tin ngân hàng ── */}
      <Dialog open={bankDialogOpen} onOpenChange={setBankDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle style={{ color: T.text }}>Thông tin ngân hàng</DialogTitle>
            <DialogDescription style={{ color: T.sub }}>
              Cung cấp STK để nhận tiền hoàn
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 mt-2">
            {[
              { label: 'Tên ngân hàng', key: 'bankName', placeholder: 'VD: Vietcombank, Techcombank...' },
              { label: 'Số tài khoản', key: 'bankAccount', placeholder: 'Nhập số tài khoản' },
              { label: 'Tên chủ tài khoản', key: 'accountHolder', placeholder: 'Họ và tên chủ tài khoản' },
            ].map(({ label, key, placeholder }) => (
              <div key={key}>
                <label className="text-[13px] font-semibold uppercase tracking-widest mb-1.5 block"
                  style={{ color: T.sub }}>
                  {label}
                </label>
                <input
                  value={(bankForm as any)[key]}
                  onChange={e => setBankForm(prev => ({ ...prev, [key]: e.target.value }))}
                  placeholder={placeholder}
                  className="w-full px-4 py-2.5 rounded-2xl text-[14px] outline-none"
                  style={{ background: T.bg, border: T.border, color: T.text }}
                />
              </div>
            ))}

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setBankDialogOpen(false)}
                className="flex-1 py-3 rounded-full text-[14px] font-medium transition-all"
                style={{ color: T.text, border: T.border, background: 'transparent' }}
                onMouseEnter={e => (e.currentTarget.style.background = T.bg)}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                Hủy
              </button>
              <button
                onClick={handleSubmitBankInfo}
                disabled={submittingBank}
                className="flex-1 py-3 rounded-full text-[14px] font-medium text-white transition-opacity"
                style={{ background: T.accent }}
                onMouseEnter={e => (e.currentTarget.style.opacity = '0.88')}
                onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
              >
                {submittingBank
                  ? <span className="inline-flex items-center gap-2 justify-center">
                      <Loader2 className="h-4 w-4 animate-spin" />Đang lưu...
                    </span>
                  : 'Lưu'
                }
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}