'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ArrowLeft, ShoppingCart, BookOpen, Package, Tag,
  Users, Minus, Plus, Star,
} from 'lucide-react';
import { useCartStore } from '@/lib/store/cart-store';
import { useAuthStore } from '@/lib/store/auth-store';
import { reviewApi, ReviewResponse } from '@/lib/api/review-api';
import WishlistButton from '@/components/WishlistButton';
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

interface BookResponse {
  bookId: number;
  title: string;
  description: string;
  price: number;
  stock: number;
  salePercent: number;
  image: string;
  createdAt: string;
  authors: string[];
  categories: string[];
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080';

// ── StarRating ───────────────────────────────────────────────────────────────
function StarRating({ rating, size = 'md' }: { rating: number; size?: 'sm' | 'md' }) {
  const s = size === 'sm' ? 'h-3.5 w-3.5' : 'h-5 w-5';
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} className={`${s} ${i <= rating ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}`} />
      ))}
    </div>
  );
}

// ── ReviewSection ────────────────────────────────────────────────────────────
function ReviewSection({ bookId }: { bookId: number }) {
  const { token, isAuthenticated } = useAuthStore();
  const [reviews, setReviews] = useState<ReviewResponse[]>([]);
  const [avgRating, setAvgRating] = useState(0);
  const [canReview, setCanReview] = useState(false);
  const [hasReviewed, setHasReviewed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');

  useEffect(() => {
    reviewApi.getByBook(bookId).then(setReviews).catch(() => {});
    reviewApi.getAvgRating(bookId).then((d) => setAvgRating(d.avgRating)).catch(() => {});
    if (isAuthenticated && token) {
      reviewApi.canReview(bookId, token)
        .then((d) => { setCanReview(d.canReview); setHasReviewed(d.hasReviewed); })
        .catch(() => {});
    }
  }, [bookId, token, isAuthenticated]);

  const handleSubmit = async () => {
    if (!token) return;
    setSubmitting(true);
    try {
      const newReview = await reviewApi.createReview({ bookId, rating, comment }, token);
      setReviews((prev) => [newReview, ...prev]);
      setHasReviewed(true);
      setCanReview(false);
      setComment('');
      toast.success('Đánh giá của bạn đã được gửi!');
      reviewApi.getAvgRating(bookId).then((d) => setAvgRating(d.avgRating)).catch(() => {});
    } catch (e: any) {
      toast.error(e.message || 'Gửi đánh giá thất bại');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      {/* Header đánh giá */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-[11px] font-semibold tracking-widest uppercase mb-1" style={{ color: T.accent }}>
            Cộng đồng
          </p>
          <h2 className="font-bold tracking-[-0.02em] text-[22px]" style={{ color: T.text }}>
            Đánh giá & Nhận xét
          </h2>
        </div>
        {avgRating > 0 && (
          <div className="flex items-center gap-2">
            <StarRating rating={Math.round(avgRating)} />
            <span className="text-[18px] font-bold" style={{ color: T.text }}>{avgRating.toFixed(1)}</span>
            <span className="text-[13px]" style={{ color: T.sub }}>({reviews.length} đánh giá)</span>
          </div>
        )}
      </div>

      {/* Form viết đánh giá */}
      {canReview && !hasReviewed && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl p-6 mb-6"
          style={{ background: T.card, border: T.border }}
        >
          <p className="font-semibold text-[15px] mb-4" style={{ color: T.text }}>
            Viết đánh giá của bạn
          </p>

          <div className="flex items-center gap-2 mb-4">
            <span className="text-[13px]" style={{ color: T.sub }}>Xếp hạng:</span>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((i) => (
                <button key={i}
                  onClick={() => setRating(i)}
                  onMouseEnter={() => setHoverRating(i)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="transition-transform hover:scale-110"
                >
                  <Star className={`h-7 w-7 transition-colors ${
                    i <= (hoverRating || rating)
                      ? 'fill-amber-400 text-amber-400'
                      : 'text-gray-300'
                  }`} />
                </button>
              ))}
            </div>
            <span className="text-[13px] font-medium ml-1" style={{ color: T.text }}>
              {['', 'Tệ', 'Không hay', 'Bình thường', 'Hay', 'Tuyệt vời'][hoverRating || rating]}
            </span>
          </div>

          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Chia sẻ cảm nhận của bạn về cuốn sách này..."
            rows={4}
            className="w-full px-4 py-3 rounded-2xl text-[14px] resize-none outline-none"
            style={{ background: T.bg, border: T.border, color: T.text }}
          />

          <div className="flex justify-end mt-3">
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full text-[14px] font-medium text-white transition-opacity"
              style={{ background: T.accent }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '0.88')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
            >
              {submitting ? 'Đang gửi...' : 'Gửi đánh giá'}
            </button>
          </div>
        </motion.div>
      )}

      {/* Đã đánh giá */}
      {hasReviewed && (
        <div className="rounded-3xl px-5 py-3 mb-6 text-[14px] font-medium flex items-center gap-2"
          style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534' }}>
          <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
          Bạn đã đánh giá cuốn sách này
        </div>
      )}

      {/* Chưa đăng nhập */}
      {!isAuthenticated && (
        <div className="rounded-3xl px-5 py-4 mb-6 text-[14px]"
          style={{ background: T.bg, border: T.border, color: T.sub }}>
          <Link href="/login" className="font-semibold transition-opacity"
            style={{ color: T.accent }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '0.7')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '1')}>
            Đăng nhập
          </Link>
          {' '}để viết đánh giá (chỉ áp dụng cho khách hàng đã mua sách)
        </div>
      )}

      {/* Danh sách review */}
      {reviews.length === 0 ? (
        <div className="text-center py-10">
          <Star className="h-10 w-10 mx-auto mb-3 opacity-20" style={{ color: T.sub }} />
          <p className="text-[14px]" style={{ color: T.sub }}>Chưa có đánh giá nào. Hãy là người đầu tiên!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => (
            <motion.div
              key={review.reviewId}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-3xl p-5"
              style={{ background: T.card, border: T.border }}
            >
              <div className="flex items-start gap-3">
                <div
                  className="relative h-10 w-10 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center"
                  style={{ background: T.accentBg }}
                >
                  {review.avatarUrl ? (
                    <Image src={review.avatarUrl} alt={review.username} fill className="object-cover" />
                  ) : (
                    <span className="font-bold text-[13px]" style={{ color: T.accent }}>
                      {review.username.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>

                <div className="flex-1">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div>
                      <span className="font-semibold text-[14px]" style={{ color: T.text }}>
                        {review.username}
                      </span>
                      <div className="mt-0.5">
                        <StarRating rating={review.rating} size="sm" />
                      </div>
                    </div>
                    <span className="text-[12px]" style={{ color: T.sub }}>
                      {new Date(review.createdAt).toLocaleDateString('vi-VN', {
                        day: '2-digit', month: '2-digit', year: 'numeric',
                      })}
                    </span>
                  </div>
                  {review.comment && (
                    <p className="mt-2 text-[14px] leading-relaxed" style={{ color: T.text }}>
                      {review.comment}
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── TabSection ───────────────────────────────────────────────────────────────
function TabSection({ book }: { book: BookResponse }) {
  const [activeTab, setActiveTab] = useState<'info' | 'reviews'>('info');

  return (
    <div className="rounded-3xl overflow-hidden" style={{ background: T.card, border: T.border }}>
      {/* Tab bar */}
      <div className="flex" style={{ borderBottom: T.border }}>
        {(['info', 'reviews'] as const).map((tab) => {
          const label = tab === 'info' ? 'Thông tin chi tiết' : 'Bình luận';
          const active = activeTab === tab;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="px-6 py-4 text-[13px] font-semibold uppercase tracking-widest transition-all"
              style={{
                background: active ? T.accent : 'transparent',
                color: active ? '#ffffff' : T.sub,
              }}
              onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = T.bg; }}
              onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div className="px-8 py-8">
        {activeTab === 'info' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {book.description ? (
              <p className="text-[15px] leading-relaxed whitespace-pre-line" style={{ color: T.text }}>
                {book.description}
              </p>
            ) : (
              <p className="text-[15px]" style={{ color: T.sub }}>Chưa có thông tin chi tiết.</p>
            )}
          </motion.div>
        )}
        {activeTab === 'reviews' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <ReviewSection bookId={book.bookId} />
          </motion.div>
        )}
      </div>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────
export default function BookDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { addItem, isLoading: cartLoading } = useCartStore();
  const { token, isAuthenticated } = useAuthStore();
  const [book, setBook] = useState<BookResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    if (!id) return;
    const fetchBook = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API_BASE}/books/${id}`);
        if (!res.ok) throw new Error('Không tìm thấy sách');
        setBook(await res.json());
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Lỗi không xác định');
      } finally {
        setLoading(false);
      }
    };
    fetchBook();
  }, [id]);

  const salePrice = book ? Math.round(book.price * (1 - (book.salePercent ?? 0) / 100)) : 0;

  const handleAddToCart = async () => {
    if (!book) return;
    if (!isAuthenticated || !token) {
      toast.error('Vui lòng đăng nhập để thêm vào giỏ hàng!');
      router.push('/login');
      return;
    }
    const result = await addItem(book.bookId, quantity, token);
    if (result.success) toast.success(`Đã thêm "${book.title}" vào giỏ hàng!`);
    else toast.error(result.message);
  };

  const handleBuyNow = async () => {
    if (!book) return;
    if (!isAuthenticated || !token) {
      toast.error('Vui lòng đăng nhập để mua hàng!');
      router.push('/login');
      return;
    }
    const result = await addItem(book.bookId, quantity, token);
    if (result.success) router.push('/checkout');
    else toast.error(result.message);
  };

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: T.bg }}>
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        className="h-10 w-10 rounded-full border-4 border-t-transparent"
        style={{ borderColor: T.accent, borderTopColor: 'transparent' }}
      />
    </div>
  );

  // ── Error ────────────────────────────────────────────────────────────────
  if (error || !book) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ background: T.bg }}>
      <BookOpen className="h-16 w-16" style={{ color: T.sub }} />
      <p className="text-[16px]" style={{ color: T.sub }}>{error ?? 'Không tìm thấy sách'}</p>
      <button
        onClick={() => router.back()}
        className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-[14px] font-medium transition-all"
        style={{ color: T.accent, border: `1.5px solid ${T.accent}`, background: 'transparent' }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = T.accent; (e.currentTarget as HTMLElement).style.color = '#fff'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = T.accent; }}
      >
        <ArrowLeft className="h-4 w-4" /> Quay lại
      </button>
    </div>
  );

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div style={{ background: T.bg, minHeight: '100vh' }}>
      <div className="max-w-[1200px] mx-auto px-6 py-10 pb-20">

        {/* Breadcrumb */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 mb-8 text-[13px]"
          style={{ color: T.sub }}
        >
          <Link href="/" style={{ color: T.sub }}
            onMouseEnter={e => (e.currentTarget.style.color = T.accent)}
            onMouseLeave={e => (e.currentTarget.style.color = T.sub)}>
            Trang chủ
          </Link>
          <span>/</span>
          <Link href="/shop" style={{ color: T.sub }}
            onMouseEnter={e => (e.currentTarget.style.color = T.accent)}
            onMouseLeave={e => (e.currentTarget.style.color = T.sub)}>
            Cửa hàng
          </Link>
          <span>/</span>
          <span className="font-medium line-clamp-1" style={{ color: T.text }}>{book.title}</span>
        </motion.div>

        {/* ── Grid: Ảnh + Thông tin ── */}
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 mb-12">

          {/* Ảnh bìa */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="flex justify-center"
          >
            <div className="relative w-full max-w-sm">
              {/* Glow effect */}
              <div
                className="absolute inset-0 rounded-3xl blur-2xl scale-110"
                style={{ background: `linear-gradient(135deg, ${T.accentBg}, rgba(0,113,227,0.12))` }}
              />
              <div className="relative aspect-[3/4] rounded-3xl overflow-hidden shadow-2xl" style={{ border: T.border }}>
                <Image
                  src={book.image || 'https://picsum.photos/id/24/400/600'}
                  alt={book.title}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 80vw, 400px"
                  priority
                />

                {/* Wishlist button */}
                <div className="absolute top-4 right-4 z-10">
                  <WishlistButton bookId={book.bookId} variant="icon" size="lg" />
                </div>

                {/* Badge giảm giá */}
                {book.salePercent > 0 && (
                  <div className="absolute top-4 left-4">
                    <span
                      className="flex items-center justify-center w-12 h-12 rounded-full text-[13px] font-bold text-white shadow-lg"
                      style={{ background: '#ff3b30' }}
                    >
                      -{book.salePercent}%
                    </span>
                  </div>
                )}
              </div>
            </div>
          </motion.div>

          {/* Thông tin sách */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="flex flex-col gap-5"
          >
            {/* Categories */}
            {book.categories?.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {book.categories.map((cat) => (
                  <span
                    key={cat}
                    className="px-3 py-1 rounded-full text-[12px] font-medium"
                    style={{ background: T.accentBg, color: T.accent, border: `1px solid rgba(0,113,227,0.2)` }}
                  >
                    {cat}
                  </span>
                ))}
              </div>
            )}

            {/* Tiêu đề */}
            <h1
              className="font-bold tracking-[-0.03em] leading-tight"
              style={{ fontSize: 'clamp(24px, 3.5vw, 38px)', color: T.text }}
            >
              {book.title}
            </h1>

            {/* Tác giả */}
            {book.authors?.length > 0 && (
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 flex-shrink-0" style={{ color: T.sub }} />
                <span className="text-[14px]" style={{ color: T.sub }}>
                  Tác giả:{' '}
                  {book.authors.map((author, index) => (
                    <span key={author}>
                      <Link
                        href={`/author/${encodeURIComponent(author)}`}
                        className="font-semibold transition-opacity"
                        style={{ color: T.accent }}
                        onMouseEnter={e => (e.currentTarget.style.opacity = '0.7')}
                        onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                      >
                        {author}
                      </Link>
                      {index < book.authors.length - 1 && ', '}
                    </span>
                  ))}
                </span>
              </div>
            )}

            {/* Divider */}
            <div style={{ height: 1, background: '#d2d2d7' }} />

            {/* Giá */}
            <div className="flex items-end gap-3">
              <span
                className="font-bold tracking-[-0.02em]"
                style={{ fontSize: 'clamp(28px, 4vw, 40px)', color: T.accent }}
              >
                {salePrice.toLocaleString('vi-VN')}đ
              </span>
              {book.salePercent > 0 && (
                <span className="text-[18px] line-through mb-1" style={{ color: T.sub }}>
                  {book.price.toLocaleString('vi-VN')}đ
                </span>
              )}
            </div>

            {/* Tồn kho + giảm giá */}
            <div className="grid grid-cols-2 gap-3">
              <div
                className="flex items-center gap-3 rounded-2xl p-4"
                style={{ background: T.bg, border: T.border }}
              >
                <div
                  className="h-8 w-8 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: T.accentBg }}
                >
                  <Package className="h-4 w-4" style={{ color: T.accent }} />
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: T.sub }}>
                    Số lượng còn
                  </p>
                  <p className="text-[14px] font-semibold" style={{ color: T.text }}>
                    {book.stock} cuốn
                  </p>
                </div>
              </div>
              <div
                className="flex items-center gap-3 rounded-2xl p-4"
                style={{ background: T.bg, border: T.border }}
              >
                <div
                  className="h-8 w-8 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: T.accentBg }}
                >
                  <Tag className="h-4 w-4" style={{ color: T.accent }} />
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: T.sub }}>
                    Giảm giá
                  </p>
                  <p className="text-[14px] font-semibold" style={{ color: T.text }}>
                    {book.salePercent > 0 ? `${book.salePercent}%` : 'Không có'}
                  </p>
                </div>
              </div>
            </div>

            {/* Divider */}
            <div style={{ height: 1, background: '#d2d2d7' }} />

            {/* Số lượng */}
            <div className="flex items-center gap-4">
              <span className="text-[14px] font-medium" style={{ color: T.text }}>Số lượng:</span>
              <div
                className="flex items-center gap-2 rounded-full px-2 py-1"
                style={{ background: T.bg, border: T.border }}
              >
                <button
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  disabled={quantity <= 1}
                  className="h-8 w-8 rounded-full flex items-center justify-center transition-all disabled:opacity-40"
                  style={{ color: T.text }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#e8e8ed')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <Minus className="h-3 w-3" />
                </button>
                <span className="w-8 text-center font-semibold text-[15px]" style={{ color: T.text }}>
                  {quantity}
                </span>
                <button
                  onClick={() => setQuantity((q) => Math.min(book.stock, q + 1))}
                  disabled={quantity >= book.stock}
                  className="h-8 w-8 rounded-full flex items-center justify-center transition-all disabled:opacity-40"
                  style={{ color: T.text }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#e8e8ed')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <Plus className="h-3 w-3" />
                </button>
              </div>
              <span className="text-[13px]" style={{ color: T.sub }}>Còn {book.stock} sản phẩm</span>
            </div>

            {/* Nút Thêm vào giỏ + Wishlist */}
            <div className="flex gap-3 items-center">
              <button
                onClick={handleAddToCart}
                disabled={book.stock === 0 || cartLoading}
                className="flex-1 inline-flex items-center justify-center gap-2 py-4 rounded-full text-[15px] font-semibold text-white transition-opacity disabled:opacity-50"
                style={{ background: T.accent }}
                onMouseEnter={e => (e.currentTarget.style.opacity = '0.88')}
                onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
              >
                <ShoppingCart className="h-5 w-5" />
                {book.stock === 0 ? 'Hết hàng' : 'Thêm vào giỏ hàng'}
              </button>
              <WishlistButton bookId={book.bookId} variant="icon" size="lg" />
            </div>

            {/* Nút mua ngay */}
            {book.stock > 0 && (
              <button
                onClick={handleBuyNow}
                disabled={cartLoading}
                className="w-full py-4 rounded-full text-[15px] font-semibold transition-all disabled:opacity-50"
                style={{ color: T.accent, border: `1.5px solid ${T.accent}`, background: 'transparent' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = T.accent; (e.currentTarget as HTMLElement).style.color = '#fff'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = T.accent; }}
              >
                Mua ngay
              </button>
            )}

            {/* Quay lại */}
            <button
              onClick={() => router.back()}
              className="self-start inline-flex items-center gap-2 text-[14px] transition-colors"
              style={{ color: T.sub }}
              onMouseEnter={e => (e.currentTarget.style.color = T.text)}
              onMouseLeave={e => (e.currentTarget.style.color = T.sub)}
            >
              <ArrowLeft className="h-4 w-4" /> Quay lại
            </button>
          </motion.div>
        </div>

        {/* ── Tab: Chi tiết / Bình luận ── */}
        <TabSection book={book} />
      </div>
    </div>
  );
}