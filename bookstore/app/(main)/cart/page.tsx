'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Trash2, Minus, Plus, ShoppingBag, ArrowRight,
  Tag, X, Leaf, ChevronDown, ChevronUp, Gift
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useCartStore } from '@/lib/store/cart-store';
import { useAuthStore } from '@/lib/store/auth-store';
import { promotionApi, PromotionResponse } from '@/lib/api/promotion-api';
import { useCheckoutStore } from '@/lib/store/checkout-store';
import { toast } from 'sonner';

const SHIPPING_FEE = 50000;

const discountTypeLabel: Record<string, string> = {
  PERCENT: 'Giảm %',
  FIXED: 'Giảm tiền',
  FREESHIP: 'Miễn ship',
};

export default function CartPage() {
  const router = useRouter();

  const cart = useCartStore((state) => state.cart);
  const isLoading = useCartStore((state) => state.isLoading);
  const fetchCart = useCartStore((state) => state.fetchCart);
  const updateItem = useCartStore((state) => state.updateItem);
  const removeItem = useCartStore((state) => state.removeItem);
  const clearCart = useCartStore((state) => state.clearCart);

  const token = useAuthStore((state) => state.token);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const [promotions, setPromotions] = useState<PromotionResponse[]>([]);
  const [showPromos, setShowPromos] = useState(false);
  const [appliedPromos, setAppliedPromos] = useState<Record<string, PromotionResponse>>({});

  const setCheckoutData = useCheckoutStore((state) => state.setCheckoutData);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  useEffect(() => {
    if (token) fetchCart(token);
  }, [token]);

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

  const toggleItem = (cartItemId: number) => {
    setSelectedIds((prev) =>
      prev.includes(cartItemId)
        ? prev.filter((id) => id !== cartItemId)
        : [...prev, cartItemId]
    );
  };

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
    let discount = 0;
    let freeShip = false;
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

  // 🔥 Áp mã: gọi validate mới của BE với đầy đủ context
  const handleApplyPromo = async (promo: PromotionResponse) => {
    const type = promo.discountType;
    if (appliedPromos[type]) {
      toast.error('Bạn đã có mã ' + discountTypeLabel[type] + ' rồi!');
      return;
    }
    if (subtotal === 0) {
      toast.error('Vui lòng chọn sản phẩm trước khi áp mã!');
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
    setAppliedPromos((prev) => {
      const next = { ...prev };
      delete next[type];
      return next;
    });
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
    } else {
      toast.error(result.message);
    }
    await fetchCart(token);
  };

  const handleClearAll = async () => {
    if (!token || !cart) return;
    const result = await clearCart(token);
    if (result.success) {
      toast.success('Đã xóa toàn bộ giỏ hàng!');
      setSelectedIds([]);
    } else {
      toast.error(result.message);
    }
  };

  const handleCheckout = () => {
    if (!isAuthenticated) {
      toast.error('Vui lòng đăng nhập để tiếp tục!');
      router.push('/login?redirect=/checkout');
      return;
    }
    if (selectedIds.length === 0) {
      toast.error('Vui lòng chọn ít nhất 1 sản phẩm!');
      return;
    }
    const selectedItems = cart!.items.filter((i) => selectedIds.includes(i.cartItemId));
    setCheckoutData(selectedIds, selectedItems, appliedPromos);
    router.push('/checkout');
  };

  if (!cart || cart.items.length === 0) {
    return (
      <div className="min-h-screen py-16">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-md mx-auto"
          >
            <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-muted flex items-center justify-center">
              <ShoppingBag className="h-12 w-12 text-muted-foreground" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-4">
              Giỏ hàng trống
            </h1>
            <p className="text-muted-foreground mb-8">
              Bạn chưa có sản phẩm nào trong giỏ hàng. Hãy khám phá cửa hàng!
            </p>
            <Link href="/shop">
              <Button className="rounded-full bg-primary hover:bg-primary/90 text-primary-foreground">
                <Leaf className="h-4 w-4 mr-2" />
                Khám phá sách
              </Button>
            </Link>
          </motion.div>
        </div>
      </div>
    );
  }

  const availableIds = cart.items
    .filter((i) => i.stock > 0 && !(i as any).deleted)
    .map((i) => i.cartItemId);
  const allSelected =
    availableIds.length > 0 && availableIds.every((id) => selectedIds.includes(id));

  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Giỏ hàng</h1>
              <p className="text-muted-foreground mt-1">{cart.totalItems} sản phẩm</p>
            </div>
            <Button variant="outline" size="sm" onClick={handleClearAll} className="rounded-full text-destructive hover:text-destructive">
              <Trash2 className="h-4 w-4 mr-2" />
              Xóa tất cả
            </Button>
          </div>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* ===== DANH SÁCH SẢN PHẨM ===== */}
          <div className="lg:col-span-2">
            {/* Wrapper card */}
            <div className="rounded-2xl overflow-hidden" style={{ background: '#ffffff', border: '1px solid #d2d2d7' }}>
              {/* Select all */}
              <div className="flex items-center gap-3 px-5 py-3.5" style={{ borderBottom: '1px solid #f0f0f0' }}>
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  className="h-4 w-4 rounded cursor-pointer accent-[#0071e3]"
                />
                <span className="text-[14px]" style={{ color: '#6e6e73' }}>
                  Chọn tất cả ({availableIds.length})
                </span>
              </div>

            <AnimatePresence>
              {cart.items.map((item, idx) => {
                const isDeleted = (item as any).deleted;
                const isOutOfStock = item.stock === 0;
                const unavailable = isDeleted || isOutOfStock;
                const isSelected = selectedIds.includes(item.cartItemId);

                return (
                  <motion.div
                    key={item.cartItemId}
                    layout
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className={`p-5 flex gap-4 ${unavailable ? 'opacity-60' : ''}`}
                    style={{ borderBottom: idx < cart.items.length - 1 ? '1px solid #f0f0f0' : 'none' }}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleItem(item.cartItemId)}
                      disabled={unavailable}
                      className="mt-1 h-4 w-4 rounded accent-primary cursor-pointer disabled:cursor-not-allowed"
                    />

                    <div className="relative w-20 h-28 flex-shrink-0 rounded-lg overflow-hidden bg-muted">
                      {item.image && (
                        <Image src={item.image} alt={item.title} fill className="object-cover" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground line-clamp-2">{item.title}</h3>
                      {isDeleted && (
                        <Badge variant="destructive" className="mt-1 text-xs">
                          Sách đã bị xóa
                        </Badge>
                      )}
                      {!isDeleted && isOutOfStock && (
                        <Badge variant="destructive" className="mt-1 text-xs">
                          Hết hàng
                        </Badge>
                      )}

                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-sm font-bold text-primary">
                          {item.finalPrice.toLocaleString('vi-VN')}đ
                        </span>
                        {item.salePercent > 0 && (
                          <span className="text-xs text-muted-foreground line-through">
                            {item.originalPrice.toLocaleString('vi-VN')}đ
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between mt-3">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7 rounded-full"
                            onClick={() => handleUpdate(item.cartItemId, item.quantity - 1)}
                            disabled={item.quantity <= 1 || unavailable}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="text-sm font-medium w-8 text-center">{item.quantity}</span>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7 rounded-full"
                            onClick={() => handleUpdate(item.cartItemId, item.quantity + 1)}
                            disabled={item.quantity >= item.stock || unavailable}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>

                        <button
                          onClick={() => handleRemove(item.cartItemId)}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
            </div>{/* end wrapper card */}
          </div>

          {/* ===== TÓM TẮT ĐƠN HÀNG ===== */}
          <div className="lg:col-span-1">
            <div className="rounded-2xl p-6 sticky top-20" style={{ background: '#ffffff', border: '1px solid #d2d2d7' }}>
              <h2 className="text-[17px] font-semibold mb-5" style={{ color: '#1d1d1f' }}>Tóm tắt đơn hàng</h2>

              <p className="text-sm text-muted-foreground mb-4">
                Đã chọn{' '}
                <span className="font-medium text-foreground">{selectedIds.length}</span>
                /{cart.totalItems} sản phẩm
              </p>

              {Object.values(appliedPromos).length > 0 && (
                <div className="space-y-2 mb-4">
                  {Object.entries(appliedPromos).map(([type, promo]) => (
                    <div
                      key={type}
                      className="flex items-center justify-between bg-primary/10 rounded-xl px-3 py-2"
                    >
                      <div className="flex items-center gap-2">
                        <Tag className="h-4 w-4 text-primary" />
                        <div>
                          <span className="font-medium text-primary text-sm">{promo.code}</span>
                          <span className="text-xs text-muted-foreground ml-2">
                            {promo.discountType === 'PERCENT' && '-' + promo.discountValue + '%'}
                            {promo.discountType === 'FIXED' &&
                              '-' + promo.discountValue.toLocaleString('vi-VN') + 'đ'}
                            {promo.discountType === 'FREESHIP' && 'Miễn phí ship'}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemovePromo(type)}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="mb-6">
                <button
                  onClick={() => setShowPromos(!showPromos)}
                  className="w-full flex items-center justify-between style={{ border: '1px solid #d2d2d7' }} rounded-xl px-4 py-3 text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors"
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
                      <div className="mt-2 style={{ border: '1px solid #d2d2d7' }} rounded-xl overflow-hidden">
                        {promotions.length === 0 ? (
                          <p className="text-sm text-muted-foreground text-center py-4">
                            Không có mã khuyến mãi nào
                          </p>
                        ) : (
                          promotions.map((promo) => {
                            const isApplied = !!appliedPromos[promo.discountType];
                            const isThisApplied =
                              appliedPromos[promo.discountType]?.promotion_id === promo.promotion_id;
                            return (
                              <div
                                key={promo.promotion_id}
                                className="flex items-center justify-between px-4 py-3 border-b border-border last:border-0 hover:bg-muted/50 transition-colors"
                              >
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-semibold text-sm text-foreground">
                                      {promo.code}
                                    </span>
                                    <Badge variant="outline" className="text-xs">
                                      {discountTypeLabel[promo.discountType]}
                                    </Badge>
                                  </div>
                                  <p className="text-xs text-muted-foreground mt-0.5">
                                    {promo.discountType === 'PERCENT' &&
                                      'Giảm ' + promo.discountValue + '%'}
                                    {promo.discountType === 'FIXED' &&
                                      'Giảm ' + promo.discountValue.toLocaleString('vi-VN') + 'đ'}
                                    {promo.discountType === 'FREESHIP' && 'Miễn phí vận chuyển'}
                                    {promo.minOrderValue && promo.minOrderValue > 0 &&
                                      ' · Đơn từ ' + promo.minOrderValue.toLocaleString('vi-VN') + 'đ'}
                                    {' · Còn ' + promo.remainingDays + ' ngày'}
                                  </p>
                                </div>
                                <Button
                                  size="sm"
                                  variant={isThisApplied ? 'default' : 'outline'}
                                  className="rounded-full text-xs h-7"
                                  disabled={isApplied && !isThisApplied}
                                  onClick={() =>
                                    isThisApplied
                                      ? handleRemovePromo(promo.discountType)
                                      : handleApplyPromo(promo)
                                  }
                                >
                                  {isThisApplied ? 'Bỏ' : 'Dùng'}
                                </Button>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <Separator className="my-4" />

              <div className="space-y-3">
                <div className="flex justify-between text-muted-foreground">
                  <span>Tạm tính</span>
                  <span>{subtotal.toLocaleString('vi-VN')}đ</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Giảm giá</span>
                    <span>-{discount.toLocaleString('vi-VN')}đ</span>
                  </div>
                )}
                <div className="flex justify-between text-muted-foreground">
                  <span>Phí vận chuyển</span>
                  {freeShip ? (
                    <span className="text-green-600">Miễn phí</span>
                  ) : (
                    <span>{SHIPPING_FEE.toLocaleString('vi-VN')}đ</span>
                  )}
                </div>
                <Separator />
                <div className="flex justify-between text-lg font-bold text-foreground">
                  <span>Tổng cộng</span>
                  <span className="text-primary">{total.toLocaleString('vi-VN')}đ</span>
                </div>
              </div>

              <Button
                size="lg"
                className="w-full mt-6 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground"
                onClick={handleCheckout}
                disabled={isLoading || selectedIds.length === 0}
              >
                Tiến hành thanh toán
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>

              <Link href="/shop" className="block text-center mt-4">
                <Button variant="ghost" className="text-muted-foreground">
                  Tiếp tục mua sắm
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}