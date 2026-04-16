'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Heart, Loader2, ShoppingCart, Trash2, Star } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/lib/store/auth-store';
import { wishlistApi, WishlistResponse } from '@/lib/api/wishlist-api';
import { cartApi } from '@/lib/api/cart-api';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

function formatPrice(price: number) {
  return new Intl.NumberFormat('vi-VN').format(price) + 'đ';
}

function getImageUrl(image: string) {
  if (!image) return '/placeholder.png';
  if (image.startsWith('http')) return image;
  return `${API_BASE_URL}/uploads/${image}`;
}

export default function WishlistPage() {
  const router = useRouter();
  const { token, isAuthenticated } = useAuthStore();
  const [items, setItems] = useState<WishlistResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [removingId, setRemovingId] = useState<number | null>(null);
  const [addingToCartId, setAddingToCartId] = useState<number | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login?redirect=/wishlist');
      return;
    }
    if (!token) return;

    (async () => {
      try {
        const data = await wishlistApi.getMyWishlist(token);
        setItems(data);
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : 'Không tải được danh sách');
      } finally {
        setIsLoading(false);
      }
    })();
  }, [token, isAuthenticated, router]);

  const handleRemove = async (bookId: number) => {
    if (!token) return;
    setRemovingId(bookId);
    try {
      await wishlistApi.remove(bookId, token);
      setItems((prev) => prev.filter((i) => i.bookId !== bookId));
      toast.success('Đã xoá khỏi danh sách yêu thích');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Xoá thất bại');
    } finally {
      setRemovingId(null);
    }
  };

  const handleAddToCart = async (bookId: number, stock: number) => {
    if (!token) return;
    if (stock <= 0) {
      toast.error('Sách đã hết hàng');
      return;
    }
    setAddingToCartId(bookId);
    try {
      await cartApi.addItem(bookId, 1, token);
      toast.success('Đã thêm vào giỏ hàng');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Thêm vào giỏ thất bại');
    } finally {
      setAddingToCartId(null);
    }
  };

  // ----- Loading -----
  if (isLoading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: '#f5f5f7' }}
      >
        <Loader2 className="h-10 w-10 animate-spin" style={{ color: '#0071e3' }} />
      </div>
    );
  }

  // ----- Empty state -----
  if (items.length === 0) {
    return (
      <div className="min-h-screen py-16 px-4" style={{ background: '#f5f5f7' }}>
        <div className="max-w-[800px] mx-auto">
          <h1
            className="text-[32px] font-bold tracking-[-0.02em] mb-2"
            style={{ color: '#1d1d1f' }}
          >
            Danh sách yêu thích
          </h1>
          <p className="text-[15px] mb-10" style={{ color: '#6e6e73' }}>
            Những cuốn sách bạn đã đánh dấu yêu thích
          </p>

          <div
            className="rounded-2xl p-16 text-center"
            style={{ background: '#ffffff', border: '1px solid #d2d2d7' }}
          >
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5"
              style={{ background: '#f5f5f7' }}
            >
              <Heart className="h-10 w-10" style={{ color: '#d2d2d7' }} />
            </div>
            <h2
              className="text-[20px] font-semibold tracking-[-0.02em] mb-2"
              style={{ color: '#1d1d1f' }}
            >
              Chưa có sách yêu thích
            </h2>
            <p className="text-[15px] mb-6" style={{ color: '#6e6e73' }}>
              Hãy khám phá và lưu lại những cuốn sách bạn yêu thích nhé
            </p>
            <Link
              href="/"
              className="inline-block px-8 py-3 rounded-xl text-[15px] font-medium text-white transition-opacity"
              style={{ background: '#0071e3' }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.opacity = '0.88')}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.opacity = '1')}
            >
              Khám phá sách
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ----- List -----
  return (
    <div className="min-h-screen py-16 px-4" style={{ background: '#f5f5f7' }}>
      <div className="max-w-[1200px] mx-auto">
        <div className="mb-10">
          <h1
            className="text-[32px] font-bold tracking-[-0.02em] mb-2"
            style={{ color: '#1d1d1f' }}
          >
            Danh sách yêu thích
          </h1>
          <p className="text-[15px]" style={{ color: '#6e6e73' }}>
            {items.length} cuốn sách trong danh sách
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {items.map((item) => {
            const finalPrice =
              item.salePercent > 0
                ? item.price * (1 - item.salePercent / 100)
                : item.price;
            const outOfStock = item.stock <= 0;

            return (
              <div
                key={item.wishlistId}
                className="rounded-2xl overflow-hidden transition-all flex flex-col"
                style={{ background: '#ffffff', border: '1px solid #d2d2d7' }}
              >
                {/* Image */}
                <Link href={`/books/${item.bookId}`} className="block relative">
                  <div
                    className="aspect-[3/4] relative overflow-hidden"
                    style={{ background: '#f5f5f7' }}
                  >
                    <Image
                      src={getImageUrl(item.image)}
                      alt={item.title}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                      className="object-cover"
                    />
                    {item.salePercent > 0 && (
                      <span
                        className="absolute top-3 left-3 px-2.5 py-1 rounded-md text-[12px] font-semibold text-white"
                        style={{ background: '#ff3b30' }}
                      >
                        -{item.salePercent}%
                      </span>
                    )}
                    {outOfStock && (
                      <div
                        className="absolute inset-0 flex items-center justify-center"
                        style={{ background: 'rgba(0,0,0,0.5)' }}
                      >
                        <span
                          className="px-4 py-1.5 rounded-lg text-[13px] font-semibold text-white"
                          style={{ background: '#1d1d1f' }}
                        >
                          Hết hàng
                        </span>
                      </div>
                    )}
                  </div>
                </Link>

                {/* Body — flex column + flex-1 để kéo dài hết card */}
                <div className="p-4 flex flex-col flex-1">
                  <Link href={`/books/${item.bookId}`}>
                    <h3
                      className="text-[15px] font-semibold tracking-[-0.01em] mb-1 line-clamp-2 min-h-[44px]"
                      style={{ color: '#1d1d1f' }}
                    >
                      {item.title}
                    </h3>
                  </Link>

                  <p className="text-[13px] mb-2 line-clamp-1 min-h-[18px]" style={{ color: '#6e6e73' }}>
                    {item.authors?.join(', ') || 'Đang cập nhật'}
                  </p>

                  {/* Rating — luôn chiếm chỗ dù không có rating */}
                  <div className="flex items-center gap-1 mb-2 min-h-[18px]">
                    {item.avgRating > 0 && (
                      <>
                        <Star
                          className="h-3.5 w-3.5"
                          style={{ color: '#ff9500', fill: '#ff9500' }}
                        />
                        <span className="text-[12px]" style={{ color: '#6e6e73' }}>
                          {item.avgRating.toFixed(1)}
                        </span>
                      </>
                    )}
                  </div>

                  {/* Price — cố định chiều cao để card cùng sale và không sale đều nhau */}
                  <div className="flex items-baseline gap-2 mb-4 min-h-[28px]">
                    <span
                      className="text-[17px] font-semibold tracking-[-0.01em]"
                      style={{ color: '#1d1d1f' }}
                    >
                      {formatPrice(finalPrice)}
                    </span>
                    {item.salePercent > 0 && (
                      <span
                        className="text-[13px] line-through"
                        style={{ color: '#6e6e73' }}
                      >
                        {formatPrice(item.price)}
                      </span>
                    )}
                  </div>

                  {/* Buttons — mt-auto đẩy xuống đáy card */}
                  <div className="flex gap-2 mt-auto">
                    <button
                      onClick={() => handleAddToCart(item.bookId, item.stock)}
                      disabled={addingToCartId === item.bookId || outOfStock}
                      className="flex-1 py-2.5 rounded-xl text-[13px] font-medium text-white transition-opacity flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                      style={{ background: '#0071e3' }}
                    >
                      {addingToCartId === item.bookId ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <>
                          <ShoppingCart className="h-3.5 w-3.5" />
                          Thêm
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => handleRemove(item.bookId)}
                      disabled={removingId === item.bookId}
                      className="px-3 py-2.5 rounded-xl transition-colors disabled:opacity-40"
                      style={{ background: '#f5f5f7', color: '#ff3b30' }}
                      title="Xoá khỏi yêu thích"
                    >
                      {removingId === item.bookId ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}