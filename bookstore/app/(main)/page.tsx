'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { ArrowRight, Star, ChevronLeft, ChevronRight } from 'lucide-react';
import Image from 'next/image';
import { BookCard } from '@/components/book-card';
import { bookApi, BookResponse } from '@/lib/api/book-api';
import { Book } from '@/lib/types';

const BANNERS = [
  { id: 1, image: '/banners/banner1.png', alt: 'Banner 1', href: '/shop' },
  { id: 2, image: '/banners/banner2.webp', alt: 'Banner 2', href: '/shop?filter=new' },
  { id: 3, image: '/banners/banner3.jpg', alt: 'Banner 3', href: '/shop?filter=sale' },
];

function BannerSlider() {
  const [current, setCurrent] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const next = useCallback(() => setCurrent((c) => (c + 1) % BANNERS.length), []);
  const prev = useCallback(() => setCurrent((c) => (c - 1 + BANNERS.length) % BANNERS.length), []);

  useEffect(() => {
    if (isHovered) return;
    timerRef.current = setInterval(next, 4500);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [next, isHovered]);

  return (
    <div
      className="relative w-full overflow-hidden select-none"
      style={{ aspectRatio: '16/6', background: '#f5f5f7' }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={BANNERS[current].id}
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -30 }}
          transition={{ duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="absolute inset-0"
        >
          <Link href={BANNERS[current].href}>
            <Image
              src={BANNERS[current].image}
              alt={BANNERS[current].alt}
              fill
              className="object-cover"
              priority
            />
          </Link>
        </motion.div>
      </AnimatePresence>

      {/* Arrows */}
      <button
        onClick={prev}
        className="absolute left-4 top-1/2 -translate-y-1/2 z-10 flex items-center justify-center h-10 w-10 rounded-full transition-all"
        style={{ background: 'rgba(255,255,255,0.75)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
        onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.95)')}
        onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.75)')}
      >
        <ChevronLeft className="h-5 w-5" style={{ color: '#1d1d1f' }} />
      </button>
      <button
        onClick={next}
        className="absolute right-4 top-1/2 -translate-y-1/2 z-10 flex items-center justify-center h-10 w-10 rounded-full transition-all"
        style={{ background: 'rgba(255,255,255,0.75)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
        onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.95)')}
        onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.75)')}
      >
        <ChevronRight className="h-5 w-5" style={{ color: '#1d1d1f' }} />
      </button>

      {/* Dots */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2">
        {BANNERS.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className="transition-all"
            style={{
              height: '6px',
              width: i === current ? '20px' : '6px',
              borderRadius: '3px',
              background: i === current ? '#1d1d1f' : 'rgba(29,29,31,0.3)',
            }}
          />
        ))}
      </div>
    </div>
  );
}

function toSlug(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function mapToBook(b: BookResponse): Book {
  const salePrice = b.salePercent > 0
    ? Math.round(b.price * (1 - b.salePercent / 100))
    : b.price;

  const categoryList = b.categories ?? [];
  const categoryName = categoryList[0] ?? 'Chưa phân loại';

  const allCategories = categoryList
    .filter((name) => name && name.trim() !== '')
    .map((name) => ({
      name: name.trim(),
      slug: toSlug(name),
    }));

  return {
    id: String(b.bookId),
    title: b.title,
    description: b.description ?? '',
    price: salePrice,
    originalPrice: b.salePercent > 0 ? b.price : undefined,
    image: b.image || 'https://picsum.photos/id/24/400/600',
    stock: b.stock,
    rating: b.avgRating ?? 0,
    reviewCount: b.reviewCount ?? 0,
    publishYear: 0,
    pages: 0,
    isbn: '',
    author: {
      id: '',
      name: b.authors?.join(', ') ?? 'Không rõ',
      bio: '',
      avatar: '',
      bookCount: 0,
    },
    category: {
      id: '',
      name: categoryName,
      slug: toSlug(categoryName),
      description: '',
      bookCount: 0,
    },
    allCategories,
  };
}

function BookSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-5">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex flex-col gap-3">
          <div className="aspect-[3/4] rounded-2xl animate-pulse" style={{ background: '#e8e8ed' }} />
          <div className="h-3 rounded-full animate-pulse w-3/4" style={{ background: '#e8e8ed' }} />
          <div className="h-3 rounded-full animate-pulse w-1/2" style={{ background: '#e8e8ed' }} />
        </div>
      ))}
    </div>
  );
}

export default function HomePage() {
  const [featuredBooks, setFeaturedBooks] = useState<Book[]>([]);
  const [bestsellerBooks, setBestsellerBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');

  useEffect(() => {
    Promise.all([
      bookApi.getNewest(5),
      bookApi.getTopSelling(5),
    ])
      .then(([newest, topSelling]) => {
        setFeaturedBooks(newest.map(mapToBook));
        setBestsellerBooks(topSelling.map(mapToBook));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      {/* ── Banner Slider ── */}
      <BannerSlider />

      {/* ── Sách Nổi Bật ── white bg */}
      <section className="py-4" style={{ background: '#f5f5f7' }}>
        <div className="max-w-[1200px] mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="rounded-3xl px-8 py-12 md:px-12 md:py-14"
            style={{ background: '#ffffff', border: '1px solid #d2d2d7' }}
          >
            <div className="text-center mb-12">
              <p className="text-[13px] font-semibold tracking-widest uppercase mb-3" style={{ color: '#0071e3' }}>
                Mới nhất
              </p>
              <h2
                className="font-bold tracking-[-0.03em] leading-tight"
                style={{ fontSize: 'clamp(28px, 4vw, 48px)', color: '#1d1d1f' }}
              >
                Sách Nổi Bật
              </h2>
              <p className="mt-2 text-[16px]" style={{ color: '#6e6e73' }}>
                Những cuốn sách mới nhất vừa ra mắt
              </p>
            </div>

            {loading ? <BookSkeleton /> : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-5">
                {featuredBooks.map((book, index) => (
                  <BookCard key={book.id} book={book} index={index} />
                ))}
              </div>
            )}

            <div className="mt-10 text-center">
              <Link
                href="/shop"
                className="inline-flex items-center gap-2 px-7 py-3 rounded-full text-[15px] font-medium transition-all"
                style={{ color: '#0071e3', border: '1.5px solid #0071e3', background: 'transparent' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#0071e3'; (e.currentTarget as HTMLElement).style.color = '#fff'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = '#0071e3'; }}
              >
                Xem tất cả sách <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Sách Bán Chạy ── gray bg */}
      <section className="py-4 pb-8" style={{ background: '#f5f5f7' }}>
        <div className="max-w-[1200px] mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="rounded-3xl px-8 py-12 md:px-12 md:py-14"
            style={{ background: '#ffffff', border: '1px solid #d2d2d7' }}
          >
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-1.5 mb-3">
                <Star className="h-3.5 w-3.5 fill-[#0071e3] text-[#0071e3]" />
                <p className="text-[13px] font-semibold tracking-widest uppercase" style={{ color: '#0071e3' }}>
                  Best Seller
                </p>
              </div>
              <h2
                className="font-bold tracking-[-0.03em] leading-tight"
                style={{ fontSize: 'clamp(28px, 4vw, 48px)', color: '#1d1d1f' }}
              >
                Sách Bán Chạy
              </h2>
              <p className="mt-2 text-[16px]" style={{ color: '#6e6e73' }}>
                Được bạn đọc yêu thích và chọn mua nhiều nhất
              </p>
            </div>

            {loading ? <BookSkeleton /> : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-5">
                {bestsellerBooks.map((book, index) => (
                  <BookCard key={book.id} book={book} index={index} />
                ))}
              </div>
            )}

            <div className="mt-10 text-center">
              <Link
                href="/shop?filter=bestseller"
                className="inline-flex items-center gap-2 px-7 py-3 rounded-full text-[15px] font-medium transition-all"
                style={{ color: '#0071e3', border: '1.5px solid #0071e3', background: 'transparent' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#0071e3'; (e.currentTarget as HTMLElement).style.color = '#fff'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = '#0071e3'; }}
              >
                Xem sách bán chạy <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Newsletter ── dark */}
      <section className="py-24 md:py-32 text-center" style={{ background: '#1d1d1f' }}>
        <div className="max-w-[600px] mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <p className="text-[13px] font-semibold tracking-widest uppercase mb-4" style={{ color: '#0071e3' }}>
              Newsletter
            </p>
            <h2
              className="font-bold tracking-[-0.03em] leading-tight text-white mb-4"
              style={{ fontSize: 'clamp(28px, 4vw, 48px)' }}
            >
              Đừng bỏ lỡ sách mới
            </h2>
            <p className="text-[17px] mb-10" style={{ color: '#a1a1a6' }}>
              Nhận thông tin về sách mới, khuyến mãi độc quyền mỗi tuần.
            </p>
            <form
              onSubmit={(e) => { e.preventDefault(); setEmail(''); }}
              className="flex flex-col sm:flex-row gap-3"
            >
              <input
                type="email"
                placeholder="Email của bạn"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 px-5 py-3 rounded-full text-[15px] outline-none"
                style={{
                  background: 'rgba(255,255,255,0.1)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  color: '#ffffff',
                }}
              />
              <button
                type="submit"
                className="px-7 py-3 rounded-full text-[15px] font-medium text-white shrink-0 transition-opacity"
                style={{ background: '#0071e3' }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.opacity = '0.88')}
                onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.opacity = '1')}
              >
                Đăng ký
              </button>
            </form>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
