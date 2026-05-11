'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Trash2, Minus, Plus, ShoppingBag, ArrowRight,
  Tag, X, Leaf, ChevronDown, ChevronUp, Gift,
} from 'lucide-react';
import { useCartStore } from '@/lib/store/cart-store';
import { useAuthStore } from '@/lib/store/auth-store';
import { promotionApi, PromotionResponse } from '@/lib/api/promotion-api';
import { useCheckoutStore } from '@/lib/store/checkout-store';
import { toast } from 'sonner';

// ── Design tokens (đồng bộ trang chủ) ───────────────────────────────────────
const T = {
  bg: '#f5f5f7',
  card: '#ffffff',
  border: '1px solid #d2d2d7',
  borderLight: '1px solid #f0f0f0',
  text: '#1d1d1f',
  sub: '#6e6e73',
  accent: '#0071e3',
  accentBg: 'rgba(0,113,227,0.07)',
};

const SHIPPING_FEE = 50000;

const discountTypeLabel: Record<string, string> = {
  PERCENT: 'Giảm %',
  FIXED: 'Giảm tiền',
  FREESHIP: 'Miễn ship',
};

// ── Divider ──────────────────────────────────────────────────────────────────
function Divider({ light = false }) {
  return <div style={{ height: 1, background: light ? '#f0f0f0' : '#d2d2d7' }} />;
}

// ── Main page ────────────────────────────────────────────────────────────────
export default function CartPage() {
  const router = useRouter();

  const cart        = useCartStore((s) => s.cart);
  const isLoading   = useCartStore((s) => s.isLoading);
  const fetchCart   = useCartStore((s) => s.fetchCart);
  const updateItem  = useCartStore((s) => s.updateItem);
  const removeItem  = useCartStore((s) => s.removeItem);
  const clearCart   = useCartStore((s) => s.clearCart);

  const token           = useAuthStore((s) => s.token);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const [promotions, setPromotions]     = useState<PromotionResponse[]>([]);
  const [showPromos, setShowPromos]     = useState(false);
  const [appliedPromos, setAppliedPromos] = useState<Record<string, PromotionResponse>>({});

  const setCheckoutData = useCheckoutStore((s) => s.setCheckoutData);
  const [selectedIds, setSelectedIds]   = useState<number[]>([]);

  useEffect(() => { if (token) fetchCart(token); }, [token]);

  useEffect(() => {
    if (cart?.items) {
      setSelectedIds(
        cart.items
          .filter((i) => i.stock > 0 && !(i as any).deleted)
          .map((i) => i.cartItemId)
      );
    }
  }, [cart]);

  useEffect(() => {
    if (!token) return;
    promotionApi.getAll(token).then(setPromotions).catch(() => {});
  }, [token]);

  const toggleItem = (cartItemId: number) =>
    setSelectedIds((prev) =>
      prev.includes(cartItemId) ? prev.filter((id) => id !== cartItemId) : [...prev, cartItemId]
    );

  const toggleAll = () => {
    if (!cart) return;
    const availableIds = cart.items
      .filter((i) => i.stock > 0 && !(i as any).deleted)
      .map((i) => i.cartItemId);
    const allSelected = availableIds.every((id) => selectedIds.includes(id));
    setSelectedIds(allSelected ? [] : availableIds);
  };

  const subtotal =
    cart?.items
      .filter((i) => selectedIds.includes(i.cartItemId))
      .reduce((sum, i) => sum + i.subtotal, 0) ?? 0;

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
  const total = subtotal - discount + shippingFee;

  const handleApplyPromo = async (promo: PromotionResponse) => {
    const type = promo.discountType;
    if (appliedPromos[type]) { toast.error('Bạn đã có mã ' + discountTypeLabel[type] + ' rồi!'); return; }
    if (subtotal === 0) { toast.error('Vui lòng chọn sản phẩm trước khi áp mã!'); return; }
    try {
      await promotionApi.validate({
        code: promo.code,
        totalAmount: subtotal,
        shippingFee: SHIPPING_FEE,
        appliedCodes: Object.values(appliedPromos).map((p) => p.code),
      }, token ?? undefined);
      setAppliedPromos((prev) => ({ ...prev, [type]: promo }));
      toast.success('Áp dụng mã "' + promo.code + '" thành công!');
      setShowPromos(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Mã không hợp lệ');
    }
  };

  const handleRemovePromo = (type: string) => {
    setAppliedPromos((prev) => { const next = { ...prev }; delete next[type]; return next; });
    toast.success('Đã xóa mã khuyến mãi!');
  };

  const handleUpdate = async (cartItemId: number, quantity: number) => {
    if (!token) return;
    const result = await updateItem(cartItemId, quantity, token);
    if (!result.success) toast.error(result.message);
    await fetchCart(token);
  };

  const handleRemove = async (cartItemId: number) => {
    if (!token) return;
    const result = await removeItem(cartItemId, token);
    if (result.success) {
      toast.success('Đã xóa sản phẩm!');
      setSelectedIds((prev) => prev.filter((id) => id !== cartItemId));
    } else toast.error(result.message);
    await fetchCart(token);
  };

  const handleClearAll = async () => {
    if (!token || !cart) return;
    const result = await clearCart(token);
    if (result.success) { toast.success('Đã xóa toàn bộ giỏ hàng!'); setSelectedIds([]); }
    else toast.error(result.message);
  };

  const handleCheckout = () => {
    if (!isAuthenticated) { toast.error('Vui lòng đăng nhập để tiếp tục!'); router.push('/login?redirect=/checkout'); return; }
    if (selectedIds.length === 0) { toast.error('Vui lòng chọn ít nhất 1 sản phẩm!'); return; }
    const selectedItems = cart!.items.filter((i) => selectedIds.includes(i.cartItemId));
    setCheckoutData(selectedIds, selectedItems, appliedPromos);
    router.push('/checkout');
  };

  // ── Giỏ trống ───────────────────────────────────────────────────────────
  if (!cart || cart.items.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center py-16" style={{ background: T.bg }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-md mx-auto px-6"
        >
          <div
            className="w-24 h-24 mx-auto mb-6 rounded-full flex items-center justify-center"
            style={{ background: T.card, border: T.border }}
          >
            <ShoppingBag className="h-12 w-12" style={{ color: T.sub }} />
          </div>
          <p className="text-[13px] font-semibold tracking-widest uppercase mb-2" style={{ color: T.accent }}>
            Giỏ hàng
          </p>
          <h1 className="font-bold tracking-[-0.03em] mb-3"
            style={{ fontSize: 'clamp(24px, 4vw, 36px)', color: T.text }}>
            Giỏ hàng trống
          </h1>
          <p className="text-[15px] mb-8" style={{ color: T.sub }}>
            Bạn chưa có sản phẩm nào trong giỏ hàng. Hãy khám phá cửa hàng!
          </p>
          <Link
            href="/shop"
            className="inline-flex items-center gap-2 px-7 py-3 rounded-full text-[15px] font-medium text-white"
            style={{ background: T.accent }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '0.88')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
          >
            <Leaf className="h-4 w-4" /> Khám phá sách
          </Link>
        </motion.div>
      </div>
    );
  }

  const availableIds = cart.items
    .filter((i) => i.stock > 0 && !(i as any).deleted)
    .map((i) => i.cartItemId);
  const allSelected = availableIds.length > 0 && availableIds.every((id) => selectedIds.includes(id));

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div style={{ background: T.bg, minHeight: '100vh' }}>
      <div className="max-w-[1200px] mx-auto px-6 py-10">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 flex items-center justify-between"
        >
          <div>
            <p className="text-[13px] font-semibold tracking-widest uppercase mb-1" style={{ color: T.accent }}>
              Mua sắm
            </p>
            <h1 className="font-bold tracking-[-0.03em]"
              style={{ fontSize: 'clamp(26px, 4vw, 40px)', color: T.text }}>
              Giỏ hàng
            </h1>
            <p className="text-[14px] mt-0.5" style={{ color: T.sub }}>{cart.totalItems} sản phẩm</p>
          </div>
          <button
            onClick={handleClearAll}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-[13px] font-medium transition-all"
            style={{ color: '#dc2626', border: '1.5px solid #dc2626', background: 'transparent' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#dc2626'; (e.currentTarget as HTMLElement).style.color = '#fff'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = '#dc2626'; }}
          >
            <Trash2 className="h-4 w-4" /> Xóa tất cả
          </button>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-6">

          {/* ── Danh sách sản phẩm ── */}
          <div className="lg:col-span-2">
            <div className="rounded-3xl overflow-hidden" style={{ background: T.card, border: T.border }}>

              {/* Select all */}
              <div className="flex items-center gap-3 px-6 py-4" style={{ borderBottom: '1px solid #f0f0f0' }}>
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  className="h-4 w-4 rounded cursor-pointer"
                  style={{ accentColor: T.accent }}
                />
                <span className="text-[14px]" style={{ color: T.sub }}>
                  Chọn tất cả ({availableIds.length})
                </span>
              </div>

              <AnimatePresence>
                {cart.items.map((item, idx) => {
                  const isDeleted    = (item as any).deleted;
                  const isOutOfStock = item.stock === 0;
                  const unavailable  = isDeleted || isOutOfStock;
                  const isSelected   = selectedIds.includes(item.cartItemId);

                  return (
                    <motion.div
                      key={item.cartItemId}
                      layout
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className={`px-6 py-5 flex gap-4 ${unavailable ? 'opacity-50' : ''}`}
                      style={{ borderBottom: idx < cart.items.length - 1 ? '1px solid #f0f0f0' : 'none' }}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleItem(item.cartItemId)}
                        disabled={unavailable}
                        className="mt-1 h-4 w-4 rounded cursor-pointer disabled:cursor-not-allowed flex-shrink-0"
                        style={{ accentColor: T.accent }}
                      />

                      {/* Ảnh */}
                      <Link href={`/book/${item.bookId ?? ''}`} className="flex-shrink-0">
                        <div className="relative w-20 h-28 rounded-2xl overflow-hidden"
                          style={{ background: T.bg }}>
                          {item.image && (
                            <Image src={item.image} alt={item.title} fill className="object-cover" />
                          )}
                        </div>
                      </Link>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-[14px] line-clamp-2 mb-1" style={{ color: T.text }}>
                          {item.title}
                        </h3>

                        {isDeleted && (
                          <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-medium mb-1"
                            style={{ background: '#fee2e2', color: '#991b1b' }}>
                            Sách đã bị xóa
                          </span>
                        )}
                        {!isDeleted && isOutOfStock && (
                          <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-medium mb-1"
                            style={{ background: '#fee2e2', color: '#991b1b' }}>
                            Hết hàng
                          </span>
                        )}

                        <div className="flex items-center gap-2 mt-1 mb-3">
                          <span className="text-[14px] font-bold" style={{ color: T.accent }}>
                            {item.finalPrice.toLocaleString('vi-VN')}đ
                          </span>
                          {item.salePercent > 0 && (
                            <span className="text-[12px] line-through" style={{ color: T.sub }}>
                              {item.originalPrice.toLocaleString('vi-VN')}đ
                            </span>
                          )}
                        </div>

                        <div className="flex items-center justify-between">
                          {/* Qty control */}
                          <div className="flex items-center gap-1 rounded-full px-1 py-1"
                            style={{ background: T.bg, border: T.border }}>
                            <button
                              onClick={() => handleUpdate(item.cartItemId, item.quantity - 1)}
                              disabled={item.quantity <= 1 || unavailable}
                              className="h-7 w-7 rounded-full flex items-center justify-center transition-all disabled:opacity-40"
                              onMouseEnter={e => (e.currentTarget.style.background = '#e8e8ed')}
                              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                            >
                              <Minus className="h-3 w-3" style={{ color: T.text }} />
                            </button>
                            <span className="text-[13px] font-semibold w-7 text-center" style={{ color: T.text }}>
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => handleUpdate(item.cartItemId, item.quantity + 1)}
                              disabled={item.quantity >= item.stock || unavailable}
                              className="h-7 w-7 rounded-full flex items-center justify-center transition-all disabled:opacity-40"
                              onMouseEnter={e => (e.currentTarget.style.background = '#e8e8ed')}
                              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                            >
                              <Plus className="h-3 w-3" style={{ color: T.text }} />
                            </button>
                          </div>

                          {/* Xóa */}
                          <button
                            onClick={() => handleRemove(item.cartItemId)}
                            className="h-8 w-8 rounded-full flex items-center justify-center transition-all"
                            style={{ color: T.sub }}
                            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#dc2626'; (e.currentTarget as HTMLElement).style.background = '#fee2e2'; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = T.sub; (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>

          {/* ── Tóm tắt đơn hàng ── */}
          <div className="lg:col-span-1">
            <div className="rounded-3xl p-6 sticky top-6" style={{ background: T.card, border: T.border }}>
              <p className="text-[11px] font-semibold tracking-widest uppercase mb-1" style={{ color: T.accent }}>
                Thanh toán
              </p>
              <h2 className="font-bold text-[18px] tracking-[-0.02em] mb-5" style={{ color: T.text }}>
                Tóm tắt đơn hàng
              </h2>

              <p className="text-[13px] mb-4" style={{ color: T.sub }}>
                Đã chọn{' '}
                <span className="font-semibold" style={{ color: T.text }}>{selectedIds.length}</span>
                /{cart.totalItems} sản phẩm
              </p>

              {/* Mã đã áp */}
              {Object.values(appliedPromos).length > 0 && (
                <div className="space-y-2 mb-4">
                  {Object.entries(appliedPromos).map(([type, promo]) => (
                    <div
                      key={type}
                      className="flex items-center justify-between rounded-2xl px-3 py-2.5"
                      style={{ background: T.accentBg }}
                    >
                      <div className="flex items-center gap-2">
                        <Tag className="h-4 w-4 flex-shrink-0" style={{ color: T.accent }} />
                        <div>
                          <span className="font-semibold text-[13px]" style={{ color: T.accent }}>
                            {promo.code}
                          </span>
                          <span className="text-[12px] ml-1.5" style={{ color: T.sub }}>
                            {promo.discountType === 'PERCENT' && '-' + promo.discountValue + '%'}
                            {promo.discountType === 'FIXED' && '-' + promo.discountValue.toLocaleString('vi-VN') + 'đ'}
                            {promo.discountType === 'FREESHIP' && 'Miễn phí ship'}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemovePromo(type)}
                        className="h-6 w-6 rounded-full flex items-center justify-center transition-all"
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

              {/* Chọn mã khuyến mãi */}
              <div className="mb-5">
                <button
                  onClick={() => setShowPromos(!showPromos)}
                  className="w-full flex items-center justify-between rounded-2xl px-4 py-3 text-[13px] transition-all"
                  style={{
                    border: T.border,
                    color: showPromos ? T.accent : T.sub,
                    background: 'transparent',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = T.accent; (e.currentTarget as HTMLElement).style.color = T.accent; }}
                  onMouseLeave={e => { if (!showPromos) { (e.currentTarget as HTMLElement).style.borderColor = '#d2d2d7'; (e.currentTarget as HTMLElement).style.color = T.sub; } }}
                >
                  <div className="flex items-center gap-2">
                    <Gift className="h-4 w-4" />
                    <span>Chọn mã khuyến mãi</span>
                  </div>
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
                        ) : (
                          promotions.map((promo) => {
                            const isApplied     = !!appliedPromos[promo.discountType];
                            const isThisApplied = appliedPromos[promo.discountType]?.promotion_id === promo.promotion_id;
                            return (
                              <div
                                key={promo.promotion_id}
                                className="flex items-center justify-between px-4 py-3"
                                style={{ borderBottom: '1px solid #f0f0f0' }}
                              >
                                <div>
                                  <div className="flex items-center gap-2 mb-0.5">
                                    <span className="font-semibold text-[13px]" style={{ color: T.text }}>
                                      {promo.code}
                                    </span>
                                    <span
                                      className="px-2 py-0.5 rounded-full text-[11px] font-medium"
                                      style={{ background: T.accentBg, color: T.accent }}
                                    >
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
                                  className="px-3 py-1.5 rounded-full text-[12px] font-medium transition-all disabled:opacity-40"
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
                          })
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Tổng tiền */}
              <div style={{ height: 1, background: '#d2d2d7', marginBottom: 16 }} />

              <div className="space-y-3 mb-5">
                <div className="flex justify-between text-[14px]" style={{ color: T.sub }}>
                  <span>Tạm tính</span>
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
                  {freeShip
                    ? <span style={{ color: '#16a34a' }}>Miễn phí</span>
                    : <span style={{ color: T.sub }}>{SHIPPING_FEE.toLocaleString('vi-VN')}đ</span>
                  }
                </div>

                <div style={{ height: 1, background: '#d2d2d7' }} />

                <div className="flex justify-between font-bold text-[17px]" style={{ color: T.text }}>
                  <span>Tổng cộng</span>
                  <span style={{ color: T.accent }}>{total.toLocaleString('vi-VN')}đ</span>
                </div>
              </div>

              {/* CTA: Thanh toán */}
              <button
                onClick={handleCheckout}
                disabled={isLoading || selectedIds.length === 0}
                className="w-full py-4 rounded-full text-[15px] font-semibold text-white inline-flex items-center justify-center gap-2 transition-opacity disabled:opacity-50"
                style={{ background: T.accent }}
                onMouseEnter={e => (e.currentTarget.style.opacity = '0.88')}
                onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
              >
                Tiến hành thanh toán
                <ArrowRight className="h-4 w-4" />
              </button>

              {/* Tiếp tục mua */}
              <Link
                href="/shop"
                className="block text-center mt-3 text-[14px] transition-colors"
                style={{ color: T.sub }}
                onMouseEnter={e => (e.currentTarget.style.color = T.text)}
                onMouseLeave={e => (e.currentTarget.style.color = T.sub)}
              >
                Tiếp tục mua sắm
              </Link>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}