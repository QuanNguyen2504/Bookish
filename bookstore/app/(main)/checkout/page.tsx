'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, MapPin, Tag, X, Gift,
  ChevronDown, ChevronUp, ShoppingBag, Banknote, QrCode,
  CheckCheck, Loader2, Timer, Truck,
} from 'lucide-react';
import { useCheckoutStore } from '@/lib/store/checkout-store';
import { useOrderStore } from '@/lib/store/order-store';
import { useAuthStore } from '@/lib/store/auth-store';
import { useCartStore } from '@/lib/store/cart-store';
import { promotionApi, PromotionResponse } from '@/lib/api/promotion-api';
import { orderApi } from '@/lib/api/order-api';
import { shippingApi, type ShippingFeeData } from '@/lib/api/shipping-api';
import { toast } from 'sonner';

// ── Design tokens (đồng bộ trang chủ) ───────────────────────────────────────
const T = {
  bg: '#f5f5f7',
  card: '#ffffff',
  border: '1px solid #d2d2d7',
  text: '#1d1d1f',
  sub: '#6e6e73',
  accent: '#0071e3',
  accentBg: 'rgba(0,113,227,0.07)',
};

const DEFAULT_SHIPPING_FEE = 50000;
const MB_BANK_ID   = '970422';
const ACCOUNT_NO   = '0372555040';
const ACCOUNT_NAME = 'NGUYEN ANH QUAN';
const POLL_INTERVAL = 3000;
const QR_EXPIRY_MS  = 4 * 60 * 1000;

const discountTypeLabel: Record<string, string> = {
  PERCENT: 'Giảm %', FIXED: 'Giảm tiền', FREESHIP: 'Miễn ship',
};

// ── Helpers ──────────────────────────────────────────────────────────────────
function Divider({ light = false }) {
  return <div style={{ height: 1, background: light ? '#f0f0f0' : '#d2d2d7', margin: '16px 0' }} />;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold tracking-widest uppercase mb-1" style={{ color: T.accent }}>
      {children}
    </p>
  );
}

function Card({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay }}
      className="rounded-3xl px-8 py-7"
      style={{ background: T.card, border: T.border }}
    >
      {children}
    </motion.div>
  );
}

function StyledInput({
  label, required, disabled, value, onChange, placeholder, id,
}: {
  label: string; required?: boolean; disabled?: boolean;
  value: string; onChange: (v: string) => void;
  placeholder?: string; id?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-[13px] font-semibold uppercase tracking-widest" style={{ color: T.sub }}>
        {label}{required && <span style={{ color: '#dc2626' }}> *</span>}
      </label>
      <input
        id={id}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full px-4 py-3 rounded-2xl text-[14px] outline-none transition-all disabled:opacity-50"
        style={{ background: T.bg, border: T.border, color: T.text }}
        onFocus={e => (e.currentTarget.style.borderColor = T.accent)}
        onBlur={e => (e.currentTarget.style.borderColor = '#d2d2d7')}
      />
    </div>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────
export default function CheckoutPage() {
  const router = useRouter();
  const { selectedIds, selectedItems, appliedPromos: initialPromos, reset } = useCheckoutStore();
  const checkout  = useOrderStore((s) => s.checkout);
  const isLoading = useOrderStore((s) => s.isLoading);
  const token     = useAuthStore((s) => s.token);
  const fetchCart = useCartStore((s) => s.fetchCart);

  const [shippingAddress, setShippingAddress] = useState('');
  const [phone, setPhone]                     = useState('');
  const [paymentMethod, setPaymentMethod]     = useState<'CASH' | 'QR_CODE'>('CASH');
  const [promotions, setPromotions]           = useState<PromotionResponse[]>([]);
  const [showPromos, setShowPromos]           = useState(false);
  const [appliedPromos, setAppliedPromos]     = useState<Record<string, PromotionResponse>>(initialPromos);
  const [ready, setReady]                     = useState(false);

  const [pendingOrderId, setPendingOrderId] = useState<number | null>(null);
  const [qrPaid, setQrPaid]                 = useState(false);
  const [creatingQr, setCreatingQr]         = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [timeLeft, setTimeLeft]   = useState<number | null>(null);
  const [qrExpired, setQrExpired] = useState(false);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [shippingData, setShippingData]       = useState<ShippingFeeData | null>(null);
  const [shippingLoading, setShippingLoading] = useState(false);
  const [shippingError, setShippingError]     = useState('');

  useEffect(() => {
    if (selectedIds.length === 0) { router.replace('/cart'); return; }
    setReady(true);
    if (!token) return;
    promotionApi.getAll(token).then(setPromotions).catch(() => {});
  }, []);

  useEffect(() => () => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
  }, []);

  useEffect(() => {
    if (!shippingAddress || shippingAddress.trim().length < 10) {
      setShippingData(null); setShippingError(''); return;
    }
    setShippingLoading(true); setShippingError('');
    const timer = setTimeout(async () => {
      try {
        const data = await shippingApi.calculate(shippingAddress, token ?? undefined);
        setShippingData(data); setShippingError('');
      } catch (err: any) {
        setShippingError(err.message || 'Không thể tính phí ship'); setShippingData(null);
      } finally { setShippingLoading(false); }
    }, 800);
    return () => clearTimeout(timer);
  }, [shippingAddress]);

  useEffect(() => {
    if (!pendingOrderId || qrPaid || qrExpired) return;
    const expiryTime = Date.now() + QR_EXPIRY_MS;
    setTimeLeft(QR_EXPIRY_MS);
    countdownRef.current = setInterval(() => {
      const remaining = Math.max(0, expiryTime - Date.now());
      setTimeLeft(remaining);
      if (remaining <= 0) {
        if (countdownRef.current) clearInterval(countdownRef.current);
        if (pollRef.current) clearInterval(pollRef.current);
        setQrExpired(true);
        if (token && pendingOrderId) orderApi.cancelOrder(pendingOrderId, token).catch(() => {});
      }
    }, 1000);
    return () => { if (countdownRef.current) clearInterval(countdownRef.current); };
  }, [pendingOrderId, qrPaid, qrExpired]);

  const formatTime = (ms: number) => {
    const totalSec = Math.ceil(ms / 1000);
    return `${Math.floor(totalSec / 60)}:${(totalSec % 60).toString().padStart(2, '0')}`;
  };

  const subtotal = selectedItems.reduce((sum, i) => sum + i.subtotal, 0);
  const baseShippingFee = shippingData?.shippingFee ?? DEFAULT_SHIPPING_FEE;

  const calcDiscount = () => {
    let discount = 0; let freeShip = false;
    Object.values(appliedPromos).forEach((p) => {
      if (p.discountType === 'PERCENT') {
        let d = (subtotal * p.discountValue) / 100;
        if (p.maxDiscount && d > p.maxDiscount) d = p.maxDiscount;
        discount += d;
      } else if (p.discountType === 'FIXED') {
        discount += p.discountValue;
      } else if (p.discountType === 'FREESHIP') { freeShip = true; }
    });
    return { discount: Math.min(discount, subtotal), freeShip };
  };

  const { discount, freeShip } = calcDiscount();
  const shippingFee = freeShip ? 0 : baseShippingFee;
  const total = subtotal - discount + shippingFee;

  const handleApplyPromo = async (promo: PromotionResponse) => {
    const type = promo.discountType;
    if (appliedPromos[type]) { toast.error('Bạn đã có mã ' + discountTypeLabel[type] + ' rồi!'); return; }
    try {
      await promotionApi.validate({
        code: promo.code, totalAmount: subtotal,
        shippingFee: baseShippingFee,
        appliedCodes: Object.values(appliedPromos).map((p) => p.code),
      }, token ?? undefined);
      setAppliedPromos((prev) => ({ ...prev, [type]: promo }));
      toast.success('Áp dụng mã "' + promo.code + '" thành công!');
      setShowPromos(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Mã không hợp lệ');
    }
  };

  const handleRemovePromo = (type: string) =>
    setAppliedPromos((prev) => { const next = { ...prev }; delete next[type]; return next; });

  const getPromotionIds = () => Object.values(appliedPromos).map((p) => p.promotion_id);

  const handlePlaceOrder = async () => {
    if (!shippingAddress.trim()) { toast.error('Vui lòng nhập địa chỉ giao hàng!'); return; }
    if (!phone.trim())           { toast.error('Vui lòng nhập số điện thoại nhận hàng!'); return; }
    if (!token) return;
    const result = await checkout({ cartItemIds: selectedIds, shippingAddress, phone, paymentMethod, promotionIds: getPromotionIds() }, token);
    if (result.success) {
      toast.success('Đặt hàng thành công!'); reset();
      await fetchCart(token);
      router.push('/checkout/success?orderId=' + result.orderId);
    } else { toast.error(result.message); }
  };

  const handleCreateQrOrder = async () => {
    if (!shippingAddress.trim()) { toast.error('Vui lòng nhập địa chỉ giao hàng!'); return; }
    if (!phone.trim())           { toast.error('Vui lòng nhập số điện thoại nhận hàng!'); return; }
    if (!token) return;
    setCreatingQr(true); setQrExpired(false);
    const result = await checkout({ cartItemIds: selectedIds, shippingAddress, phone, paymentMethod: 'QR_CODE', promotionIds: getPromotionIds() }, token);
    setCreatingQr(false);
    if (!result.success) { toast.error(result.message); return; }
    const orderId = Number(result.orderId);
    setPendingOrderId(orderId);
    pollRef.current = setInterval(async () => {
      try {
        const order = await orderApi.getOrder(orderId, token);
        if (order.status === 'PROCESSING') {
          clearInterval(pollRef.current!);
          if (countdownRef.current) clearInterval(countdownRef.current);
          setQrPaid(true); reset();
          await fetchCart(token);
          setTimeout(() => router.push(`/checkout/success?orderId=${orderId}&paid=true`), 1500);
        }
      } catch { /* ignore */ }
    }, POLL_INTERVAL);
  };

  const handleRetryQr = () => { setPendingOrderId(null); setQrExpired(false); setTimeLeft(null); setQrPaid(false); };

  const handleBackToCart = async () => {
    if (pendingOrderId && token && !qrPaid && !qrExpired) {
      try { await orderApi.cancelOrder(pendingOrderId, token); await fetchCart(token); } catch { /* ignore */ }
    }
    if (pollRef.current) clearInterval(pollRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
    router.push('/cart');
  };

  if (!ready) return null;

  const qrSrc = `https://img.vietqr.io/image/${MB_BANK_ID}-${ACCOUNT_NO}-compact2.png`
    + `?amount=${total}`
    + `&addInfo=${encodeURIComponent('Bookish ' + (pendingOrderId ?? ''))}`
    + `&accountName=${encodeURIComponent(ACCOUNT_NAME)}`;

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div style={{ background: T.bg, minHeight: '100vh' }}>
      <div className="max-w-5xl mx-auto px-6 py-10">

        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={handleBackToCart}
            className="flex items-center justify-center h-10 w-10 rounded-full transition-all flex-shrink-0"
            style={{ background: T.card, border: T.border }}
            onMouseEnter={e => (e.currentTarget.style.background = '#e8e8ed')}
            onMouseLeave={e => (e.currentTarget.style.background = T.card)}
          >
            <ArrowLeft className="h-5 w-5" style={{ color: T.text }} />
          </button>
          <div>
            <SectionLabel>Đặt hàng</SectionLabel>
            <h1 className="font-bold tracking-[-0.03em]"
              style={{ fontSize: 'clamp(22px, 3vw, 32px)', color: T.text }}>
              Xác nhận đơn hàng
            </h1>
            <p className="text-[13px] mt-0.5" style={{ color: T.sub }}>
              {selectedItems.length} sản phẩm
            </p>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">

            {/* ── Thông tin giao hàng ── */}
            <Card delay={0}>
              <div className="flex items-center gap-2 mb-5">
                <div className="h-8 w-8 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: T.accentBg }}>
                  <MapPin className="h-4 w-4" style={{ color: T.accent }} />
                </div>
                <div>
                  <SectionLabel>Giao hàng</SectionLabel>
                  <h2 className="font-semibold text-[16px]" style={{ color: T.text }}>Thông tin giao hàng</h2>
                </div>
              </div>

              <div className="space-y-4">
                <StyledInput
                  id="address" label="Địa chỉ nhận hàng" required
                  value={shippingAddress} onChange={setShippingAddress}
                  placeholder="Số nhà, tên đường, phường/xã, quận/huyện, tỉnh/thành phố"
                  disabled={!!pendingOrderId}
                />
                <StyledInput
                  id="phone" label="Số điện thoại nhận hàng" required
                  value={phone} onChange={setPhone}
                  placeholder="0901234567" disabled={!!pendingOrderId}
                />

                {/* Phí ship */}
                {shippingAddress.trim().length >= 10 && (
                  <div className="flex items-start gap-3 rounded-2xl px-4 py-3"
                    style={{ background: T.bg, border: T.border }}>
                    <Truck className="h-4 w-4 mt-0.5 flex-shrink-0" style={{ color: T.accent }} />
                    <div className="text-[13px]">
                      {shippingLoading ? (
                        <div className="flex items-center gap-2" style={{ color: T.sub }}>
                          <Loader2 className="h-3 w-3 animate-spin" />
                          <span>Đang tính phí vận chuyển...</span>
                        </div>
                      ) : shippingData ? (
                        <div>
                          <p className="font-semibold" style={{ color: T.text }}>
                            Phí ship: {shippingData.shippingFee.toLocaleString('vi-VN')}đ
                          </p>
                          <p className="mt-0.5" style={{ color: T.sub }}>
                            {shippingData.distanceText} — {shippingData.feeDescription}
                          </p>
                          <p style={{ color: T.sub }}>Dự kiến giao: {shippingData.durationText}</p>
                        </div>
                      ) : shippingError ? (
                        <p style={{ color: '#dc2626' }}>
                          {shippingError} — Áp dụng phí mặc định {DEFAULT_SHIPPING_FEE.toLocaleString('vi-VN')}đ
                        </p>
                      ) : null}
                    </div>
                  </div>
                )}
              </div>
            </Card>

            {/* ── Phương thức thanh toán ── */}
            <Card delay={0.05}>
              <div className="flex items-center gap-2 mb-5">
                <div className="h-8 w-8 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: T.accentBg }}>
                  <Banknote className="h-4 w-4" style={{ color: T.accent }} />
                </div>
                <div>
                  <SectionLabel>Thanh toán</SectionLabel>
                  <h2 className="font-semibold text-[16px]" style={{ color: T.text }}>Phương thức thanh toán</h2>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {([
                  { key: 'CASH',    label: 'Tiền mặt (COD)', Icon: Banknote },
                  { key: 'QR_CODE', label: 'QR Code',        Icon: QrCode },
                ] as const).map(({ key, label, Icon }) => {
                  const active = paymentMethod === key;
                  return (
                    <button
                      key={key}
                      onClick={() => setPaymentMethod(key)}
                      disabled={!!pendingOrderId}
                      className="flex items-center gap-2 px-4 py-3.5 rounded-2xl transition-all disabled:opacity-50"
                      style={{
                        border: active ? `2px solid ${T.accent}` : T.border,
                        background: active ? T.accentBg : 'transparent',
                        color: active ? T.accent : T.sub,
                      }}
                    >
                      <Icon className="h-4 w-4 flex-shrink-0" />
                      <span className="text-[13px] font-medium">{label}</span>
                    </button>
                  );
                })}
              </div>

              {/* QR Code image */}
              {paymentMethod === 'QR_CODE' && pendingOrderId && !qrPaid && !qrExpired && (
                <div className="mt-6 flex flex-col items-center gap-3">
                  <img
                    src={qrSrc} alt="QR"
                    className="w-56 h-56 rounded-2xl"
                    style={{ border: T.border }}
                  />
                  {timeLeft !== null && (
                    <div className="flex items-center gap-2 text-[13px]" style={{ color: T.sub }}>
                      <Timer className="h-4 w-4" />
                      <span>Còn {formatTime(timeLeft)} để thanh toán</span>
                    </div>
                  )}
                </div>
              )}

              {paymentMethod === 'QR_CODE' && qrExpired && (
                <div className="mt-4 text-center text-[13px]" style={{ color: '#dc2626' }}>
                  Mã QR đã hết hạn. Vui lòng tạo lại.
                </div>
              )}
            </Card>

            {/* ── Danh sách sản phẩm ── */}
            <Card delay={0.08}>
              <div className="flex items-center gap-2 mb-5">
                <div className="h-8 w-8 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: T.accentBg }}>
                  <ShoppingBag className="h-4 w-4" style={{ color: T.accent }} />
                </div>
                <div>
                  <SectionLabel>Sản phẩm</SectionLabel>
                  <h2 className="font-semibold text-[16px]" style={{ color: T.text }}>
                    {selectedItems.length} sản phẩm
                  </h2>
                </div>
              </div>

              <div className="space-y-4">
                {selectedItems.map((item, idx) => (
                  <div key={item.cartItemId}>
                    <div className="flex gap-3">
                      <div className="relative w-16 h-20 flex-shrink-0 rounded-xl overflow-hidden"
                        style={{ background: T.bg }}>
                        {item.image && (
                          <Image src={item.image} alt={item.title} fill className="object-cover" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-[13px] font-semibold line-clamp-2 mb-1" style={{ color: T.text }}>
                          {item.title}
                        </h3>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[13px] font-bold" style={{ color: T.accent }}>
                            {item.finalPrice.toLocaleString('vi-VN')}đ
                          </span>
                          {item.salePercent > 0 && (
                            <span className="px-1.5 py-0.5 rounded-full text-[11px] font-medium"
                              style={{ background: '#fee2e2', color: '#dc2626' }}>
                              -{item.salePercent}%
                            </span>
                          )}
                        </div>
                        <p className="text-[12px]" style={{ color: T.sub }}>Số lượng: {item.quantity}</p>
                      </div>
                      <div className="text-[13px] font-semibold whitespace-nowrap" style={{ color: T.text }}>
                        {item.subtotal.toLocaleString('vi-VN')}đ
                      </div>
                    </div>
                    {idx < selectedItems.length - 1 && (
                      <div style={{ height: 1, background: '#f0f0f0', marginTop: 16 }} />
                    )}
                  </div>
                ))}
              </div>
            </Card>

            {/* ── Mã khuyến mãi ── */}
            {!pendingOrderId && (
              <Card delay={0.1}>
                <div className="flex items-center gap-2 mb-5">
                  <div className="h-8 w-8 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: T.accentBg }}>
                    <Gift className="h-4 w-4" style={{ color: T.accent }} />
                  </div>
                  <div>
                    <SectionLabel>Ưu đãi</SectionLabel>
                    <h2 className="font-semibold text-[16px]" style={{ color: T.text }}>Mã khuyến mãi</h2>
                  </div>
                </div>

                {/* Mã đã áp */}
                {Object.values(appliedPromos).length > 0 && (
                  <div className="space-y-2 mb-4">
                    {Object.entries(appliedPromos).map(([type, promo]) => (
                      <div key={type} className="flex items-center justify-between rounded-2xl px-3 py-2.5"
                        style={{ background: T.accentBg }}>
                        <div className="flex items-center gap-2">
                          <Tag className="h-4 w-4 flex-shrink-0" style={{ color: T.accent }} />
                          <span className="font-semibold text-[13px]" style={{ color: T.accent }}>{promo.code}</span>
                          <span className="text-[12px]" style={{ color: T.sub }}>
                            {promo.discountType === 'PERCENT' && '-' + promo.discountValue + '%'}
                            {promo.discountType === 'FIXED' && '-' + promo.discountValue.toLocaleString('vi-VN') + 'đ'}
                            {promo.discountType === 'FREESHIP' && 'Miễn phí ship'}
                          </span>
                        </div>
                        <button
                          onClick={() => handleRemovePromo(type)}
                          className="h-6 w-6 rounded-full flex items-center justify-center transition-colors"
                          style={{ color: T.sub }}
                          onMouseEnter={e => (e.currentTarget.style.color = T.text)}
                          onMouseLeave={e => (e.currentTarget.style.color = T.sub)}
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Toggle dropdown */}
                <button
                  onClick={() => setShowPromos(!showPromos)}
                  className="w-full flex items-center justify-between rounded-2xl px-4 py-3 text-[13px] transition-all"
                  style={{ border: T.border, color: showPromos ? T.accent : T.sub, background: 'transparent' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = T.accent; (e.currentTarget as HTMLElement).style.color = T.accent; }}
                  onMouseLeave={e => { if (!showPromos) { (e.currentTarget as HTMLElement).style.borderColor = '#d2d2d7'; (e.currentTarget as HTMLElement).style.color = T.sub; } }}
                >
                  <span>Chọn mã khuyến mãi</span>
                  {showPromos ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>

                <AnimatePresence>
                  {showPromos && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-2 rounded-2xl overflow-hidden" style={{ border: T.border }}>
                        {promotions.length === 0 ? (
                          <p className="text-[13px] text-center py-5" style={{ color: T.sub }}>
                            Không có mã khuyến mãi nào
                          </p>
                        ) : promotions.map((promo) => {
                          const isApplied     = !!appliedPromos[promo.discountType];
                          const isThisApplied = appliedPromos[promo.discountType]?.promotion_id === promo.promotion_id;
                          return (
                            <div key={promo.promotion_id}
                              className="flex items-center justify-between px-4 py-3 transition-colors"
                              style={{ borderBottom: '1px solid #f0f0f0' }}
                              onMouseEnter={e => (e.currentTarget.style.background = T.bg)}
                              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                            >
                              <div>
                                <div className="flex items-center gap-2 mb-0.5">
                                  <span className="font-semibold text-[13px]" style={{ color: T.text }}>{promo.code}</span>
                                  <span className="px-2 py-0.5 rounded-full text-[11px] font-medium"
                                    style={{ background: T.accentBg, color: T.accent }}>
                                    {discountTypeLabel[promo.discountType]}
                                  </span>
                                </div>
                                <p className="text-[12px]" style={{ color: T.sub }}>
                                  {promo.discountType === 'PERCENT' && 'Giảm ' + promo.discountValue + '%'}
                                  {promo.discountType === 'FIXED' && 'Giảm ' + promo.discountValue.toLocaleString('vi-VN') + 'đ'}
                                  {promo.discountType === 'FREESHIP' && 'Miễn phí vận chuyển'}
                                  {promo.minOrderValue && promo.minOrderValue > 0 && ' · Đơn từ ' + promo.minOrderValue.toLocaleString('vi-VN') + 'đ'}
                                  {' · Còn ' + promo.remainingDays + ' ngày'}
                                </p>
                              </div>
                              <button
                                disabled={isApplied && !isThisApplied}
                                onClick={() => isThisApplied ? handleRemovePromo(promo.discountType) : handleApplyPromo(promo)}
                                className="px-3 py-1.5 rounded-full text-[12px] font-medium transition-all disabled:opacity-40 flex-shrink-0"
                                style={isThisApplied
                                  ? { background: T.accent, color: '#fff' }
                                  : { color: T.accent, border: `1.5px solid ${T.accent}`, background: 'transparent' }
                                }
                                onMouseEnter={e => { if (!isThisApplied && !(isApplied && !isThisApplied)) { (e.currentTarget as HTMLElement).style.background = T.accent; (e.currentTarget as HTMLElement).style.color = '#fff'; } }}
                                onMouseLeave={e => { if (!isThisApplied) { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = T.accent; } }}
                              >
                                {isThisApplied ? 'Bỏ' : 'Dùng'}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Card>
            )}
          </div>

          {/* ── Tóm tắt đơn hàng ── */}
          <div className="lg:col-span-1">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="rounded-3xl p-6 sticky top-6"
              style={{ background: T.card, border: T.border }}
            >
              <SectionLabel>Thanh toán</SectionLabel>
              <h2 className="font-bold text-[18px] tracking-[-0.02em] mb-5" style={{ color: T.text }}>
                Tóm tắt đơn hàng
              </h2>

              <div className="space-y-3 mb-5">
                <div className="flex justify-between text-[14px]" style={{ color: T.sub }}>
                  <span>Tạm tính ({selectedItems.length} sản phẩm)</span>
                  <span>{subtotal.toLocaleString('vi-VN')}đ</span>
                </div>

                {discount > 0 && (
                  <div className="flex justify-between text-[14px]">
                    <span style={{ color: T.sub }}>Giảm giá</span>
                    <span style={{ color: '#16a34a' }}>-{discount.toLocaleString('vi-VN')}đ</span>
                  </div>
                )}

                <div className="flex justify-between text-[14px]">
                  <span style={{ color: T.sub }}>Phí vận chuyển</span>
                  <div className="text-right">
                    {freeShip ? (
                      <span style={{ color: '#16a34a' }}>Miễn phí</span>
                    ) : shippingLoading ? (
                      <span className="text-[12px]" style={{ color: T.sub }}>Đang tính...</span>
                    ) : shippingData ? (
                      <div>
                        <span style={{ color: T.sub }}>{shippingData.shippingFee.toLocaleString('vi-VN')}đ</span>
                        <p className="text-[12px]" style={{ color: T.sub }}>{shippingData.distanceText}</p>
                      </div>
                    ) : (
                      <span style={{ color: T.sub }}>{DEFAULT_SHIPPING_FEE.toLocaleString('vi-VN')}đ</span>
                    )}
                  </div>
                </div>

                <div className="flex justify-between text-[14px]">
                  <span style={{ color: T.sub }}>Thanh toán</span>
                  <span style={{ color: T.sub }}>{paymentMethod === 'QR_CODE' ? 'QR Code' : 'Tiền mặt (COD)'}</span>
                </div>

                <div style={{ height: 1, background: '#d2d2d7' }} />

                <div className="flex justify-between font-bold text-[17px]" style={{ color: T.text }}>
                  <span>Tổng cộng</span>
                  <span style={{ color: T.accent }}>{total.toLocaleString('vi-VN')}đ</span>
                </div>
              </div>

              {/* CTA buttons */}
              {paymentMethod === 'CASH' && (
                <button
                  onClick={handlePlaceOrder}
                  disabled={isLoading}
                  className="w-full py-4 rounded-full text-[15px] font-semibold text-white transition-opacity disabled:opacity-50"
                  style={{ background: T.accent }}
                  onMouseEnter={e => (e.currentTarget.style.opacity = '0.88')}
                  onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                >
                  {isLoading ? 'Đang xử lý...' : 'Đặt hàng'}
                </button>
              )}

              {paymentMethod === 'QR_CODE' && !pendingOrderId && (
                <button
                  onClick={handleCreateQrOrder}
                  disabled={creatingQr}
                  className="w-full py-4 rounded-full text-[15px] font-semibold text-white inline-flex items-center justify-center gap-2 transition-opacity disabled:opacity-50"
                  style={{ background: T.accent }}
                  onMouseEnter={e => (e.currentTarget.style.opacity = '0.88')}
                  onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                >
                  {creatingQr
                    ? <><Loader2 className="h-4 w-4 animate-spin" />Đang tạo mã QR...</>
                    : <><QrCode className="h-4 w-4" />Tạo mã QR thanh toán</>
                  }
                </button>
              )}

              {paymentMethod === 'QR_CODE' && pendingOrderId && !qrPaid && !qrExpired && (
                <div className="py-3.5 rounded-full flex items-center justify-center gap-2 text-[14px]"
                  style={{ background: T.bg, color: T.sub }}>
                  <Loader2 className="h-4 w-4 animate-spin" style={{ color: T.accent }} />
                  Chờ xác nhận thanh toán...
                </div>
              )}

              {paymentMethod === 'QR_CODE' && qrExpired && !qrPaid && (
                <button
                  onClick={handleRetryQr}
                  className="w-full py-4 rounded-full text-[15px] font-semibold inline-flex items-center justify-center gap-2 transition-all"
                  style={{ color: T.accent, border: `1.5px solid ${T.accent}`, background: 'transparent' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = T.accent; (e.currentTarget as HTMLElement).style.color = '#fff'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = T.accent; }}
                >
                  <QrCode className="h-4 w-4" /> Tạo lại mã QR
                </button>
              )}

              {qrPaid && (
                <div className="py-3.5 rounded-full flex items-center justify-center gap-2 text-[14px] font-medium"
                  style={{ background: '#f0fdf4', color: '#16a34a' }}>
                  <CheckCheck className="h-4 w-4" />
                  Đã thanh toán — đang chuyển trang
                </div>
              )}

              <button
                onClick={handleBackToCart}
                className="block w-full text-center mt-3 text-[14px] transition-colors"
                style={{ color: T.sub }}
                onMouseEnter={e => (e.currentTarget.style.color = T.text)}
                onMouseLeave={e => (e.currentTarget.style.color = T.sub)}
              >
                Quay lại giỏ hàng
              </button>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}