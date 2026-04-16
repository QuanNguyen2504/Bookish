'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, MapPin, Tag, X, Gift,
  ChevronDown, ChevronUp, ShoppingBag, Banknote, QrCode, CheckCheck, Loader2, Timer,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCheckoutStore } from '@/lib/store/checkout-store';
import { useOrderStore } from '@/lib/store/order-store';
import { useAuthStore } from '@/lib/store/auth-store';
import { useCartStore } from '@/lib/store/cart-store';
import { promotionApi, PromotionResponse } from '@/lib/api/promotion-api';
import { orderApi } from '@/lib/api/order-api';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const SHIPPING_FEE   = 50000;
const MB_BANK_ID     = '970422';
const ACCOUNT_NO     = '0372555040';
const ACCOUNT_NAME   = 'NGUYEN ANH QUAN';
const POLL_INTERVAL  = 3000;
const QR_EXPIRY_MS   = 4 * 60 * 1000;

const discountTypeLabel: Record<string, string> = {
  PERCENT: 'Giảm %', FIXED: 'Giảm tiền', FREESHIP: 'Miễn ship',
};

export default function CheckoutPage() {
  const router   = useRouter();
  const { selectedIds, selectedItems, appliedPromos: initialPromos, reset } = useCheckoutStore();
  const checkout  = useOrderStore((s) => s.checkout);
  const isLoading = useOrderStore((s) => s.isLoading);
  const token     = useAuthStore((s) => s.token);
  const fetchCart = useCartStore((s) => s.fetchCart);

  const [shippingAddress, setShippingAddress]   = useState('');
  const [phone, setPhone]                       = useState('');
  const [paymentMethod, setPaymentMethod]       = useState<'CASH' | 'QR_CODE'>('CASH');
  const [promotions, setPromotions]             = useState<PromotionResponse[]>([]);
  const [showPromos, setShowPromos]             = useState(false);
  const [appliedPromos, setAppliedPromos]       = useState<Record<string, PromotionResponse>>(initialPromos);
  const [ready, setReady]                       = useState(false);

  const [pendingOrderId, setPendingOrderId]     = useState<number | null>(null);
  const [qrPaid, setQrPaid]                     = useState(false);
  const [creatingQr, setCreatingQr]             = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [timeLeft, setTimeLeft]   = useState<number | null>(null);
  const [qrExpired, setQrExpired] = useState(false);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
        if (token && pendingOrderId) {
          orderApi.cancelOrder(pendingOrderId, token).catch(() => {});
        }
      }
    }, 1000);

    return () => { if (countdownRef.current) clearInterval(countdownRef.current); };
  }, [pendingOrderId, qrPaid, qrExpired]);

  const formatTime = (ms: number) => {
    const totalSec = Math.ceil(ms / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const subtotal = selectedItems.reduce((sum, i) => sum + i.subtotal, 0);

  const calcDiscount = () => {
    let discount = 0; let freeShip = false;
    Object.values(appliedPromos).forEach((p) => {
      if (p.discountType === 'PERCENT') {
        let d = (subtotal * p.discountValue) / 100;
        if (p.maxDiscount && d > p.maxDiscount) d = p.maxDiscount;
        discount += d;
      } else if (p.discountType === 'FIXED') {
        discount += p.discountValue;
      } else if (p.discountType === 'FREESHIP') {
        freeShip = true;
      }
    });
    return { discount: Math.min(discount, subtotal), freeShip };
  };

  const { discount, freeShip } = calcDiscount();
  const shippingFee = freeShip ? 0 : SHIPPING_FEE;
  const total       = subtotal - discount + shippingFee;

  // 🔥 Áp mã ở checkout: gọi validate mới
  const handleApplyPromo = async (promo: PromotionResponse) => {
    const type = promo.discountType;
    if (appliedPromos[type]) {
      toast.error('Bạn đã có mã ' + discountTypeLabel[type] + ' rồi!');
      return;
    }
    try {
      await promotionApi.validate(
        {
          code: promo.code,
          totalAmount: subtotal,
          shippingFee: SHIPPING_FEE,
          appliedCodes: Object.values(appliedPromos).map((p) => p.code),
        },
        token ?? undefined
      );
      setAppliedPromos((prev) => ({ ...prev, [type]: promo }));
      toast.success('Áp dụng mã "' + promo.code + '" thành công!');
      setShowPromos(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Mã không hợp lệ';
      toast.error(message);
    }
  };

  const handleRemovePromo = (type: string) => {
    setAppliedPromos((prev) => { const next = { ...prev }; delete next[type]; return next; });
  };

  // 🔥 Helper: gom tất cả promotion_id thành array
  const getPromotionIds = () =>
    Object.values(appliedPromos).map((p) => p.promotion_id);

  // ── CASH ──
  const handlePlaceOrder = async () => {
    if (!shippingAddress.trim()) { toast.error('Vui lòng nhập địa chỉ giao hàng!'); return; }
    if (!phone.trim())           { toast.error('Vui lòng nhập số điện thoại nhận hàng!'); return; }
    if (!token) return;

    const result = await checkout(
      {
        cartItemIds: selectedIds,
        shippingAddress,
        phone,
        paymentMethod,
        promotionIds: getPromotionIds(), // 🔥 gửi LIST
      },
      token
    );

    if (result.success) {
      toast.success('Đặt hàng thành công!');
      reset();
      await fetchCart(token);
      router.push('/checkout/success?orderId=' + result.orderId);
    } else {
      toast.error(result.message);
    }
  };

  // ── QR ──
  const handleCreateQrOrder = async () => {
    if (!shippingAddress.trim()) { toast.error('Vui lòng nhập địa chỉ giao hàng!'); return; }
    if (!phone.trim())           { toast.error('Vui lòng nhập số điện thoại nhận hàng!'); return; }
    if (!token) return;
    setCreatingQr(true);
    setQrExpired(false);

    const result = await checkout(
      {
        cartItemIds: selectedIds,
        shippingAddress,
        phone,
        paymentMethod: 'QR_CODE',
        promotionIds: getPromotionIds(), // 🔥 gửi LIST
      },
      token
    );
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
          setQrPaid(true);
          reset();
          await fetchCart(token);
          setTimeout(() => {
            router.push(`/checkout/success?orderId=${orderId}&paid=true`);
          }, 1500);
        }
      } catch { /* ignore */ }
    }, POLL_INTERVAL);
  };

  const handleRetryQr = () => {
    setPendingOrderId(null);
    setQrExpired(false);
    setTimeLeft(null);
    setQrPaid(false);
  };

  const handleBackToCart = async () => {
    if (pendingOrderId && token && !qrPaid && !qrExpired) {
      try {
        await orderApi.cancelOrder(pendingOrderId, token);
        await fetchCart(token);
      } catch { /* ignore */ }
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

  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4 max-w-5xl">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" className="rounded-full" onClick={handleBackToCart}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Xác nhận đơn hàng</h1>
            <p className="text-muted-foreground text-sm mt-1">{selectedItems.length} sản phẩm</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">

            {/* Địa chỉ + SĐT */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              className="bg-card rounded-2xl border border-border p-6">
              <div className="flex items-center gap-2 mb-4">
                <MapPin className="h-5 w-5 text-primary" />
                <h2 className="text-base font-semibold text-foreground">Thông tin giao hàng</h2>
              </div>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="address" className="text-sm text-muted-foreground mb-1 block">
                    Địa chỉ nhận hàng <span className="text-destructive">*</span>
                  </Label>
                  <Input id="address" placeholder="Số nhà, tên đường, phường/xã, quận/huyện, tỉnh/thành phố"
                    value={shippingAddress} onChange={(e) => setShippingAddress(e.target.value)}
                    className="rounded-xl" disabled={!!pendingOrderId} />
                </div>
                <div>
                  <Label htmlFor="phone" className="text-sm text-muted-foreground mb-1 block">
                    Số điện thoại nhận hàng <span className="text-destructive">*</span>
                  </Label>
                  <Input id="phone" placeholder="0901234567"
                    value={phone} onChange={(e) => setPhone(e.target.value)}
                    className="rounded-xl" disabled={!!pendingOrderId} />
                </div>
              </div>
            </motion.div>

            {/* Phương thức thanh toán */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
              className="bg-card rounded-2xl border border-border p-6">
              <div className="flex items-center gap-2 mb-4">
                <Banknote className="h-5 w-5 text-primary" />
                <h2 className="text-base font-semibold text-foreground">Phương thức thanh toán</h2>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setPaymentMethod('CASH')}
                  disabled={!!pendingOrderId}
                  className={cn(
                    'flex items-center gap-2 px-4 py-3 rounded-xl border-2 transition-colors disabled:opacity-60',
                    paymentMethod === 'CASH'
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-border hover:border-primary/50'
                  )}
                >
                  <Banknote className="h-4 w-4" />
                  <span className="text-sm font-medium">Tiền mặt (COD)</span>
                </button>
                <button
                  onClick={() => setPaymentMethod('QR_CODE')}
                  disabled={!!pendingOrderId}
                  className={cn(
                    'flex items-center gap-2 px-4 py-3 rounded-xl border-2 transition-colors disabled:opacity-60',
                    paymentMethod === 'QR_CODE'
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-border hover:border-primary/50'
                  )}
                >
                  <QrCode className="h-4 w-4" />
                  <span className="text-sm font-medium">QR Code</span>
                </button>
              </div>

              {paymentMethod === 'QR_CODE' && pendingOrderId && !qrPaid && !qrExpired && (
                <div className="mt-6 flex flex-col items-center gap-3">
                  <img src={qrSrc} alt="QR" className="w-56 h-56 rounded-xl border border-border" />
                  {timeLeft !== null && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Timer className="h-4 w-4" />
                      <span>Còn {formatTime(timeLeft)} để thanh toán</span>
                    </div>
                  )}
                </div>
              )}
              {paymentMethod === 'QR_CODE' && qrExpired && (
                <div className="mt-6 text-center text-sm text-destructive">
                  Mã QR đã hết hạn. Vui lòng tạo lại.
                </div>
              )}
            </motion.div>

            {/* Danh sách sản phẩm */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}
              className="bg-card rounded-2xl border border-border p-6">
              <div className="flex items-center gap-2 mb-4">
                <ShoppingBag className="h-5 w-5 text-primary" />
                <h2 className="text-base font-semibold text-foreground">Sản phẩm</h2>
              </div>
              <div className="space-y-3">
                {selectedItems.map((item) => (
                  <div key={item.cartItemId} className="flex gap-3 pb-3 border-b border-border last:border-0 last:pb-0">
                    <div className="relative w-16 h-20 flex-shrink-0 rounded-lg overflow-hidden bg-muted">
                      {item.image && <Image src={item.image} alt={item.title} fill className="object-cover" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-foreground line-clamp-2">{item.title}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-sm font-bold text-primary">{item.finalPrice.toLocaleString('vi-VN')}đ</span>
                        {item.salePercent > 0 && <Badge variant="secondary" className="text-xs">-{item.salePercent}%</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground">Số lượng: {item.quantity}</p>
                    </div>
                    <div className="text-sm font-semibold text-foreground whitespace-nowrap">
                      {item.subtotal.toLocaleString('vi-VN')}đ
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Mã khuyến mãi */}
            {!pendingOrderId && (
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                className="bg-card rounded-2xl border border-border p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Gift className="h-5 w-5 text-primary" />
                  <h2 className="text-base font-semibold text-foreground">Mã khuyến mãi</h2>
                </div>
                {Object.values(appliedPromos).length > 0 && (
                  <div className="space-y-2 mb-3">
                    {Object.entries(appliedPromos).map(([type, promo]) => (
                      <div key={type} className="flex items-center justify-between bg-primary/10 rounded-xl px-3 py-2">
                        <div className="flex items-center gap-2">
                          <Tag className="h-4 w-4 text-primary" />
                          <span className="font-medium text-primary text-sm">{promo.code}</span>
                          <span className="text-xs text-muted-foreground">
                            {promo.discountType === 'PERCENT' && '-' + promo.discountValue + '%'}
                            {promo.discountType === 'FIXED' && '-' + promo.discountValue.toLocaleString('vi-VN') + 'đ'}
                            {promo.discountType === 'FREESHIP' && 'Miễn phí ship'}
                          </span>
                        </div>
                        <button onClick={() => handleRemovePromo(type)}><X className="h-4 w-4 text-muted-foreground hover:text-foreground" /></button>
                      </div>
                    ))}
                  </div>
                )}
                <button onClick={() => setShowPromos(!showPromos)}
                  className="w-full flex items-center justify-between border border-border rounded-xl px-4 py-3 text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors">
                  <span>Chọn mã khuyến mãi</span>
                  {showPromos ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
                {showPromos && (
                  <div className="mt-2 border border-border rounded-xl overflow-hidden">
                    {promotions.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">Không có mã khuyến mãi nào</p>
                    ) : promotions.map((promo) => {
                      const isApplied     = !!appliedPromos[promo.discountType];
                      const isThisApplied = appliedPromos[promo.discountType]?.promotion_id === promo.promotion_id;
                      return (
                        <div key={promo.promotion_id} className="flex items-center justify-between px-4 py-3 border-b border-border last:border-0 hover:bg-muted/50 transition-colors">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-sm text-foreground">{promo.code}</span>
                              <Badge variant="outline" className="text-xs">{discountTypeLabel[promo.discountType]}</Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {promo.discountType === 'PERCENT'  && 'Giảm ' + promo.discountValue + '%'}
                              {promo.discountType === 'FIXED'    && 'Giảm ' + promo.discountValue.toLocaleString('vi-VN') + 'đ'}
                              {promo.discountType === 'FREESHIP' && 'Miễn phí vận chuyển'}
                              {promo.minOrderValue && promo.minOrderValue > 0 &&
                                ' · Đơn từ ' + promo.minOrderValue.toLocaleString('vi-VN') + 'đ'}
                              {' · Còn ' + promo.remainingDays + ' ngày'}
                            </p>
                          </div>
                          <Button size="sm" variant={isThisApplied ? 'default' : 'outline'} className="rounded-full text-xs h-7"
                            disabled={isApplied && !isThisApplied}
                            onClick={() => isThisApplied ? handleRemovePromo(promo.discountType) : handleApplyPromo(promo)}>
                            {isThisApplied ? 'Bỏ' : 'Dùng'}
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            )}
          </div>

          {/* Tóm tắt */}
          <div className="lg:col-span-1">
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
              className="bg-card rounded-2xl border border-border p-6 sticky top-24">
              <h2 className="text-base font-semibold text-foreground mb-4">Tóm tắt đơn hàng</h2>
              <div className="space-y-3">
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Tạm tính ({selectedItems.length} sản phẩm)</span>
                  <span>{subtotal.toLocaleString('vi-VN')}đ</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Giảm giá</span><span>-{discount.toLocaleString('vi-VN')}đ</span>
                  </div>
                )}
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Phí vận chuyển</span>
                  {freeShip
                    ? <span className="text-green-600">Miễn phí</span>
                    : <span>{SHIPPING_FEE.toLocaleString('vi-VN')}đ</span>}
                </div>
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Thanh toán</span>
                  <span>{paymentMethod === 'QR_CODE' ? 'QR Code' : 'Tiền mặt (COD)'}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-lg font-bold text-foreground">
                  <span>Tổng cộng</span>
                  <span className="text-primary">{total.toLocaleString('vi-VN')}đ</span>
                </div>
              </div>

              {paymentMethod === 'CASH' && (
                <Button size="lg" className="w-full mt-6 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground"
                  onClick={handlePlaceOrder} disabled={isLoading}>
                  {isLoading ? 'Đang xử lý...' : 'Đặt hàng'}
                </Button>
              )}

              {paymentMethod === 'QR_CODE' && !pendingOrderId && (
                <Button size="lg" className="w-full mt-6 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground"
                  onClick={handleCreateQrOrder} disabled={creatingQr}>
                  {creatingQr
                    ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Đang tạo mã QR...</>
                    : <><QrCode className="mr-2 h-4 w-4" />Tạo mã QR thanh toán</>}
                </Button>
              )}

              {paymentMethod === 'QR_CODE' && pendingOrderId && !qrPaid && !qrExpired && (
                <div className="mt-6 flex items-center justify-center gap-2 text-sm text-muted-foreground py-3 bg-muted/40 rounded-full">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  Chờ xác nhận thanh toán...
                </div>
              )}

              {paymentMethod === 'QR_CODE' && qrExpired && !qrPaid && (
                <Button size="lg" variant="outline" className="w-full mt-6 rounded-full gap-2"
                  onClick={handleRetryQr}>
                  <QrCode className="h-4 w-4" />
                  Tạo lại mã QR
                </Button>
              )}

              {qrPaid && (
                <div className="mt-6 flex items-center justify-center gap-2 text-sm text-green-600 font-medium py-3 bg-green-50 rounded-full">
                  <CheckCheck className="h-4 w-4" />
                  Đã thanh toán — đang chuyển trang
                </div>
              )}

              <div className="block text-center mt-3">
                <Button variant="ghost" className="text-muted-foreground text-sm"
                  onClick={handleBackToCart}>
                  Quay lại giỏ hàng
                </Button>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}