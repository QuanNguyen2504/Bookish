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
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useCartStore } from '@/lib/store/cart-store';
import { useAuthStore } from '@/lib/store/auth-store';
import { reviewApi, ReviewResponse } from '@/lib/api/review-api';
import WishlistButton from '@/components/WishlistButton';
import { toast } from 'sonner';

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

function StarRating({ rating, size = 'md' }: { rating: number; size?: 'sm' | 'md' }) {
  const s = size === 'sm' ? 'h-3.5 w-3.5' : 'h-5 w-5';
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} className={`${s} ${i <= rating ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30'}`} />
      ))}
    </div>
  );
}

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
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-foreground">Đánh giá & Nhận xét</h2>
        {avgRating > 0 && (
          <div className="flex items-center gap-2">
            <StarRating rating={Math.round(avgRating)} />
            <span className="text-lg font-bold text-foreground">{avgRating.toFixed(1)}</span>
            <span className="text-sm text-muted-foreground">({reviews.length} đánh giá)</span>
          </div>
        )}
      </div>

      {canReview && !hasReviewed && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="bg-card border border-border rounded-2xl p-6 mb-8">
          <h3 className="font-semibold text-foreground mb-4">Viết đánh giá của bạn</h3>

          <div className="flex items-center gap-2 mb-4">
            <span className="text-sm text-muted-foreground">Xếp hạng:</span>
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
                      : 'text-muted-foreground/30'
                  }`} />
                </button>
              ))}
            </div>
            <span className="text-sm font-medium text-foreground ml-1">
              {['', 'Tệ', 'Không hay', 'Bình thường', 'Hay', 'Tuyệt vời'][hoverRating || rating]}
            </span>
          </div>

          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Chia sẻ cảm nhận của bạn về cuốn sách này..."
            rows={4}
            className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
          />

          <div className="flex justify-end mt-3">
            <Button onClick={handleSubmit} disabled={submitting}
              className="bg-primary hover:bg-primary/90 rounded-full px-6">
              {submitting ? 'Đang gửi...' : 'Gửi đánh giá'}
            </Button>
          </div>
        </motion.div>
      )}

      {hasReviewed && (
        <div className="bg-green-50 border border-green-200 rounded-2xl px-5 py-3 mb-8 text-sm text-green-700 font-medium">
          ✓ Bạn đã đánh giá cuốn sách này
        </div>
      )}

      {!isAuthenticated && (
        <div className="bg-muted/50 rounded-2xl px-5 py-4 mb-8 text-sm text-muted-foreground">
          <Link href="/login" className="text-primary hover:underline font-medium">Đăng nhập</Link>
          {' '}để viết đánh giá (chỉ áp dụng cho khách hàng đã mua sách)
        </div>
      )}

      {reviews.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground">
          <Star className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p>Chưa có đánh giá nào. Hãy là người đầu tiên!</p>
        </div>
      ) : (
        <div className="space-y-5">
          {reviews.map((review) => (
            <motion.div key={review.reviewId}
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className="bg-card border border-border rounded-2xl p-5">
              <div className="flex items-start gap-3">
                <div className="relative h-10 w-10 rounded-full overflow-hidden bg-primary/10 flex-shrink-0">
                  {review.avatarUrl ? (
                    <Image src={review.avatarUrl} alt={review.username} fill className="object-cover" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center">
                      <span className="text-primary font-bold text-sm">
                        {review.username.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex-1">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div>
                      <span className="font-semibold text-foreground text-sm">{review.username}</span>
                      <div className="mt-0.5">
                        <StarRating rating={review.rating} size="sm" />
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(review.createdAt).toLocaleDateString('vi-VN', {
                        day: '2-digit', month: '2-digit', year: 'numeric',
                      })}
                    </span>
                  </div>
                  {review.comment && (
                    <p className="mt-2 text-sm text-foreground leading-relaxed">{review.comment}</p>
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

  const salePrice = book ? book.price * (1 - (book.salePercent ?? 0) / 100) : 0;

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
    if (result.success) {
      router.push('/checkout');
    } else {
      toast.error(result.message);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <motion.div animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        className="h-10 w-10 rounded-full border-4 border-primary border-t-transparent" />
    </div>
  );

  if (error || !book) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <BookOpen className="h-16 w-16 text-muted-foreground" />
      <p className="text-lg text-muted-foreground">{error ?? 'Không tìm thấy sách'}</p>
      <Button onClick={() => router.back()} variant="outline" className="rounded-full">
        <ArrowLeft className="mr-2 h-4 w-4" /> Quay lại
      </Button>
    </div>
  );

  return (
    <div className="min-h-screen bg-background pb-16">
      <div className="container mx-auto px-4 py-8">

        {/* Breadcrumb */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 text-sm text-muted-foreground mb-8">
          <Link href="/" className="hover:text-primary transition-colors">Trang chủ</Link>
          <span>/</span>
          <Link href="/shop" className="hover:text-primary transition-colors">Cửa hàng</Link>
          <span>/</span>
          <span className="text-foreground line-clamp-1">{book.title}</span>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-10 lg:gap-16">

          {/* Ảnh bìa */}
          <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }} className="flex justify-center">
            <div className="relative w-full max-w-sm">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-accent/20 rounded-3xl blur-2xl scale-110" />
              <div className="relative aspect-[3/4] rounded-2xl overflow-hidden shadow-2xl border border-border">
                <Image src={book.image || 'https://picsum.photos/id/24/400/600'} alt={book.title}
                  fill className="object-cover" sizes="(max-width: 768px) 80vw, 400px" priority />

                {/*  Nút trái tim góc trên bên phải ảnh */}
                <div className="absolute top-4 right-4 z-10">
                  <WishlistButton bookId={book.bookId} variant="icon" size="lg" />
                </div>

                {book.salePercent > 0 && (
                  <div className="absolute top-4 left-4">
                    <Badge className="bg-accent text-accent-foreground font-bold text-base px-3 py-1">
                      -{book.salePercent}%
                    </Badge>
                  </div>
                )}
              </div>
            </div>
          </motion.div>

          {/* Thông tin sách */}
          <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }} className="flex flex-col gap-6">

            {book.categories?.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {book.categories.map((cat) => (
                  <Badge key={cat} variant="outline" className="text-secondary border-secondary/50">{cat}</Badge>
                ))}
              </div>
            )}

            <h1 className="text-3xl md:text-4xl font-bold text-foreground leading-tight">
              {book.title}
            </h1>

            {book.authors?.length > 0 && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Users className="h-4 w-4 shrink-0" />
                <span className="text-sm">
                  Tác giả:{' '}
                  {book.authors.map((author, index) => (
                    <span key={author}>
                      <Link href={`/author/${encodeURIComponent(author)}`}
                        className="text-primary font-medium hover:underline transition-colors">
                        {author}
                      </Link>
                      {index < book.authors.length - 1 && ', '}
                    </span>
                  ))}
                </span>
              </div>
            )}

            <div className="h-px bg-border" />

            <div className="flex items-end gap-3">
              <span className="text-4xl font-bold text-primary">
                {salePrice.toLocaleString('vi-VN')}đ
              </span>
              {book.salePercent > 0 && (
                <span className="text-xl text-muted-foreground line-through mb-1">
                  {book.price.toLocaleString('vi-VN')}đ
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2 bg-muted/50 rounded-xl p-3">
                <Package className="h-4 w-4 text-primary shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Tồn kho</p>
                  <p className="text-sm font-semibold text-foreground">{book.stock} cuốn</p>
                </div>
              </div>
              <div className="flex items-center gap-2 bg-muted/50 rounded-xl p-3">
                <Tag className="h-4 w-4 text-primary shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Giảm giá</p>
                  <p className="text-sm font-semibold text-foreground">
                    {book.salePercent > 0 ? `${book.salePercent}%` : 'Không có'}
                  </p>
                </div>
              </div>
            </div>

            <div className="h-px bg-border" />

            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-foreground">Số lượng:</span>
              <div className="flex items-center gap-2 bg-muted rounded-full px-2 py-1">
                <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))} disabled={quantity <= 1}>
                  <Minus className="h-3 w-3" />
                </Button>
                <span className="w-8 text-center font-semibold text-foreground">{quantity}</span>
                <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full"
                  onClick={() => setQuantity((q) => Math.min(book.stock, q + 1))} disabled={quantity >= book.stock}>
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
              <span className="text-xs text-muted-foreground">Còn {book.stock} sản phẩm</span>
            </div>

            {/*  Hàng nút: Thêm vào giỏ + Wishlist button (icon) */}
            <div className="flex gap-3 items-center">
              <Button onClick={handleAddToCart} disabled={book.stock === 0 || cartLoading}
                className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground rounded-full py-6 text-base font-semibold shadow-lg shadow-primary/20">
                <ShoppingCart className="mr-2 h-5 w-5" />
                {book.stock === 0 ? 'Hết hàng' : 'Thêm vào giỏ hàng'}
              </Button>

              {/*  Thay thế nút Heart cũ */}
              <WishlistButton bookId={book.bookId} variant="icon" size="lg" />
            </div>

            {/* Nút mua ngay */}
            {book.stock > 0 && (
              <Button
                onClick={handleBuyNow}
                disabled={cartLoading}
                variant="outline"
                className="w-full rounded-full py-6 text-base font-semibold border-primary text-primary hover:bg-primary hover:text-primary-foreground"
              >
                Mua ngay
              </Button>
            )}

            <Button variant="ghost" onClick={() => router.back()}
              className="self-start text-muted-foreground hover:text-foreground -ml-2">
              <ArrowLeft className="mr-2 h-4 w-4" /> Quay lại
            </Button>
          </motion.div>
        </div>
      </div>

      {/* Tab: Thông tin chi tiết / Bình luận */}
      <div className="container mx-auto px-4 mt-12">
        <TabSection book={book} />
      </div>
    </div>
  );
}

function TabSection({ book }: { book: BookResponse }) {
  const [activeTab, setActiveTab] = useState<'info' | 'reviews'>('info');

  return (
    <div className="border border-border rounded-2xl overflow-hidden">
      <div className="flex border-b border-border">
        <button
          onClick={() => setActiveTab('info')}
          className={`px-6 py-3 text-sm font-semibold uppercase tracking-wide transition-colors ${
            activeTab === 'info'
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
          }`}
        >
          Thông tin chi tiết
        </button>
        <button
          onClick={() => setActiveTab('reviews')}
          className={`px-6 py-3 text-sm font-semibold uppercase tracking-wide transition-colors ${
            activeTab === 'reviews'
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
          }`}
        >
          Bình luận
        </button>
      </div>

      <div className="p-6 bg-card">
        {activeTab === 'info' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {book.description ? (
              <p className="text-foreground leading-relaxed whitespace-pre-line">{book.description}</p>
            ) : (
              <p className="text-muted-foreground">Chưa có thông tin chi tiết.</p>
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