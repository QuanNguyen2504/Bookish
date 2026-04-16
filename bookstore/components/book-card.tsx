'use client';

import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Star, ShoppingCart } from 'lucide-react';
import { Book } from '@/lib/types';
import { useCartStore } from '@/lib/store/cart-store';
import { useAuthStore } from '@/lib/store/auth-store';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

interface BookCardProps {
  book: Book;
  index?: number;
}

export function BookCard({ book, index = 0 }: BookCardProps) {
  const { addItem, isLoading } = useCartStore();
  const { token, isAuthenticated } = useAuthStore();
  const router = useRouter();

  const isOutOfStock = book.stock === 0;

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isOutOfStock) return;

    if (!isAuthenticated || !token) {
      toast.error('Vui lòng đăng nhập để thêm vào giỏ hàng!');
      router.push('/login');
      return;
    }

    const bookId = Number(book.id);
    const result = await addItem(bookId, 1, token);

    if (result.success) {
      toast.success(`Đã thêm "${book.title}" vào giỏ hàng!`);
    } else {
      toast.error(result.message);
    }
  };

  const discountPercent = book.originalPrice
    ? Math.round((1 - book.price / book.originalPrice) * 100)
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.08 }}
    >
      <Link href={`/book/${book.id}`}>
        <div className="group">
          {/* Image */}
          <div
            className="relative aspect-[3/4] overflow-hidden mb-3"
            style={{ borderRadius: '12px', background: '#f5f5f7' }}
          >
            <Image
              src={book.image}
              alt={book.title}
              fill
              className={`object-cover transition-transform duration-500 group-hover:scale-[1.04] ${isOutOfStock ? 'opacity-50' : ''}`}
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
            />

            {/* Out of stock overlay */}
            {isOutOfStock && (
              <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.35)' }}>
                <span
                  className="text-[12px] font-semibold px-3 py-1.5 rounded-full"
                  style={{ background: 'rgba(255,255,255,0.92)', color: '#1d1d1f' }}
                >
                  Đã hết hàng
                </span>
              </div>
            )}

            {/* Discount badge */}
            {discountPercent > 0 && (
              <div className="absolute top-2.5 left-2.5">
                <span
                  className="text-[11px] font-bold px-2 py-1 rounded-md text-white"
                  style={{ background: '#0071e3' }}
                >
                  -{discountPercent}%
                </span>
              </div>
            )}

            {/* Add to cart — appears on hover */}
            {!isOutOfStock && (
              <div className="absolute bottom-0 left-0 right-0 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                <button
                  onClick={handleAddToCart}
                  disabled={isLoading}
                  className="w-full py-3 flex items-center justify-center gap-2 text-[13px] font-medium text-white transition-opacity"
                  style={{
                    background: 'rgba(29,29,31,0.88)',
                    backdropFilter: 'blur(12px)',
                    WebkitBackdropFilter: 'blur(12px)',
                  }}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = 'rgba(29,29,31,0.95)')}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = 'rgba(29,29,31,0.88)')}
                >
                  <ShoppingCart className="h-3.5 w-3.5" />
                  Thêm vào giỏ
                </button>
              </div>
            )}
          </div>

          {/* Info */}
          <div className="px-0.5">
            <p className="text-[12px] mb-0.5" style={{ color: '#6e6e73' }}>
              {book.category.name}
            </p>
            <h3
              className="text-[14px] font-semibold leading-snug line-clamp-2 mb-0.5 transition-colors"
              style={{ color: '#1d1d1f' }}
            >
              {book.title}
            </h3>
            <p className="text-[13px] mb-1.5" style={{ color: '#6e6e73' }}>
              {book.author.name}
            </p>
            <div className="flex items-center gap-1 mb-2">
              <Star className="h-3 w-3 fill-[#0071e3] text-[#0071e3]" />
              <span className="text-[12px] font-medium" style={{ color: '#1d1d1f' }}>{book.rating}</span>
              <span className="text-[12px]" style={{ color: '#6e6e73' }}>
                ({book.reviewCount.toLocaleString('vi-VN')})
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[15px] font-semibold" style={{ color: '#1d1d1f' }}>
                {book.price.toLocaleString('vi-VN')}đ
              </span>
              {book.originalPrice && (
                <span className="text-[13px] line-through" style={{ color: '#6e6e73' }}>
                  {book.originalPrice.toLocaleString('vi-VN')}đ
                </span>
              )}
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
