'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, BookOpen, ChevronDown, ChevronUp } from 'lucide-react';
import { bookApi, BookResponse } from '@/lib/api/book-api';
import { authorApi, AuthorResponse } from '@/lib/api/author-api';

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

export default function AuthorPage() {
  const { name } = useParams<{ name: string }>();
  const router = useRouter();
  const authorName = decodeURIComponent(name);

  const [books, setBooks] = useState<BookResponse[]>([]);
  const [author, setAuthor] = useState<AuthorResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showCategories, setShowCategories] = useState(true);

  useEffect(() => {
    if (!authorName) return;
    const fetchData = async () => {
      try {
        setLoading(true);
        const [booksData, authorsData] = await Promise.all([
          bookApi.getByAuthor(authorName),
          authorApi.getAll(),
        ]);
        setBooks(booksData);
        const matched = authorsData.find(
          (a) => a.name.toLowerCase() === authorName.toLowerCase()
        );
        setAuthor(matched ?? null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Lỗi không xác định');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [authorName]);

  const allCategories = useMemo(() => {
    const set = new Set<string>();
    books.forEach((b) => b.categories?.forEach((c) => set.add(c)));
    return Array.from(set).sort();
  }, [books]);

  const filteredBooks = useMemo(() => {
    if (!selectedCategory) return books;
    return books.filter((b) => b.categories?.includes(selectedCategory));
  }, [books, selectedCategory]);

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: T.bg }}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="h-10 w-10 rounded-full border-4 border-t-transparent"
          style={{ borderColor: T.accent, borderTopColor: 'transparent' }}
        />
      </div>
    );
  }

  // ── Error ────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4"
        style={{ background: T.bg }}>
        <BookOpen className="h-16 w-16" style={{ color: T.sub }} />
        <p className="text-[16px]" style={{ color: T.sub }}>{error}</p>
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
  }

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div style={{ background: T.bg, minHeight: '100vh' }}>
      <div className="max-w-[1200px] mx-auto px-6 py-10">

        {/* Breadcrumb */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 mb-8 text-[13px]"
          style={{ color: T.sub }}
        >
          <Link href="/" className="transition-colors hover:underline" style={{ color: T.sub }}
            onMouseEnter={e => (e.currentTarget.style.color = T.accent)}
            onMouseLeave={e => (e.currentTarget.style.color = T.sub)}>
            Trang chủ
          </Link>
          <span>/</span>
          <Link href="/shop" className="transition-colors" style={{ color: T.sub }}
            onMouseEnter={e => (e.currentTarget.style.color = T.accent)}
            onMouseLeave={e => (e.currentTarget.style.color = T.sub)}>
            Cửa hàng
          </Link>
          <span>/</span>
          <span className="font-medium" style={{ color: T.text }}>{authorName}</span>
        </motion.div>

        <div className="flex flex-col lg:flex-row gap-6 items-start">

          {/* ── Sidebar ── */}
          <motion.aside
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4 }}
            className="w-full lg:w-64 shrink-0 lg:sticky lg:top-8 flex flex-col gap-4"
          >
            {/* Card: Thông tin tác giả */}
            <div className="rounded-3xl overflow-hidden" style={{ background: T.card, border: T.border }}>
              {/* Header */}
              <div className="px-6 py-4" style={{ background: T.accent }}>
                <p className="text-[11px] font-semibold tracking-widest uppercase text-white/80">
                  Tác giả
                </p>
              </div>
              <div className="px-6 py-5 flex flex-col gap-2">
                <p className="font-bold text-[16px] tracking-[-0.02em]" style={{ color: T.text }}>
                  {authorName}
                </p>
                {author?.birthDate && (
                  <p className="text-[12px]" style={{ color: T.sub }}>
                    Sinh: {new Date(author.birthDate).toLocaleDateString('vi-VN')}
                  </p>
                )}
                {author?.bio && (
                  <p className="text-[13px] leading-relaxed line-clamp-5" style={{ color: T.sub }}>
                    {author.bio}
                  </p>
                )}
                <p className="text-[13px] font-semibold mt-1" style={{ color: T.accent }}>
                  {books.length} cuốn sách
                </p>
              </div>
            </div>

            {/* Card: Danh mục */}
            {allCategories.length > 0 && (
              <div className="rounded-3xl overflow-hidden" style={{ background: T.card, border: T.border }}>
                <button
                  onClick={() => setShowCategories((v) => !v)}
                  className="w-full flex items-center justify-between px-6 py-4"
                  style={{ background: T.accent }}
                >
                  <p className="text-[11px] font-semibold tracking-widest uppercase text-white/80">
                    Thể loại sách
                  </p>
                  {showCategories
                    ? <ChevronUp className="h-4 w-4 text-white" />
                    : <ChevronDown className="h-4 w-4 text-white" />
                  }
                </button>

                <AnimatePresence initial={false}>
                  {showCategories && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <ul className="py-2">
                        {/* Tất cả */}
                        <li>
                          <button
                            onClick={() => setSelectedCategory(null)}
                            className="w-full text-left px-5 py-2.5 text-[13px] flex items-center gap-2.5 transition-colors"
                            style={{
                              color: !selectedCategory ? T.accent : T.text,
                              fontWeight: !selectedCategory ? 600 : 400,
                              background: !selectedCategory ? T.accentBg : 'transparent',
                            }}
                            onMouseEnter={e => { if (selectedCategory) (e.currentTarget as HTMLElement).style.background = T.bg; }}
                            onMouseLeave={e => { if (selectedCategory) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                          >
                            <span
                              className="w-2 h-2 rounded-full flex-shrink-0"
                              style={{
                                background: !selectedCategory ? T.accent : 'transparent',
                                border: `1.5px solid ${!selectedCategory ? T.accent : T.sub}`,
                              }}
                            />
                            Tất cả sản phẩm
                          </button>
                        </li>
                        {allCategories.map((cat) => (
                          <li key={cat}>
                            <button
                              onClick={() => setSelectedCategory(cat)}
                              className="w-full text-left px-5 py-2.5 text-[13px] flex items-center gap-2.5 transition-colors"
                              style={{
                                color: selectedCategory === cat ? T.accent : T.text,
                                fontWeight: selectedCategory === cat ? 600 : 400,
                                background: selectedCategory === cat ? T.accentBg : 'transparent',
                              }}
                              onMouseEnter={e => { if (selectedCategory !== cat) (e.currentTarget as HTMLElement).style.background = T.bg; }}
                              onMouseLeave={e => { if (selectedCategory !== cat) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                            >
                              <span
                                className="w-2 h-2 rounded-full flex-shrink-0"
                                style={{
                                  background: selectedCategory === cat ? T.accent : 'transparent',
                                  border: `1.5px solid ${selectedCategory === cat ? T.accent : T.sub}`,
                                }}
                              />
                              {cat}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Nút quay lại */}
            <button
              onClick={() => router.back()}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-full text-[14px] font-medium transition-all"
              style={{ color: T.sub, background: T.card, border: T.border }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = T.text; (e.currentTarget as HTMLElement).style.background = '#e8e8ed'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = T.sub; (e.currentTarget as HTMLElement).style.background = T.card; }}
            >
              <ArrowLeft className="h-4 w-4" /> Quay lại
            </button>
          </motion.aside>

          {/* ── Danh sách sách ── */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="flex-1 min-w-0"
          >
            {/* Xóa bộ lọc */}
            {selectedCategory && (
              <div className="flex items-center justify-between mb-5">
                <p className="text-[13px]" style={{ color: T.sub }}>
                  Đang lọc: <span className="font-semibold" style={{ color: T.text }}>{selectedCategory}</span>
                  {' '}·{' '}{filteredBooks.length} cuốn
                </p>
                <button
                  onClick={() => setSelectedCategory(null)}
                  className="text-[13px] transition-opacity"
                  style={{ color: T.accent }}
                  onMouseEnter={e => (e.currentTarget.style.opacity = '0.7')}
                  onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                >
                  Xóa bộ lọc
                </button>
              </div>
            )}

            {filteredBooks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 gap-4">
                <BookOpen className="h-16 w-16" style={{ color: T.sub }} />
                <p className="text-[16px]" style={{ color: T.sub }}>Không tìm thấy sách nào.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5">
                {filteredBooks.map((book, index) => {
                  const salePrice = Math.round(book.price * (1 - (book.salePercent ?? 0) / 100));
                  return (
                    <motion.div
                      key={book.bookId}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.04 }}
                    >
                      <Link href={`/book/${book.bookId}`} className="group block">
                        {/* Ảnh bìa */}
                        <div
                          className="relative aspect-[3/4] rounded-2xl overflow-hidden mb-3"
                          style={{ background: '#e8e8ed', border: T.border }}
                        >
                          <Image
                            src={book.image || 'https://picsum.photos/id/24/400/600'}
                            alt={book.title}
                            fill
                            className="object-cover transition-transform duration-300 group-hover:scale-105"
                            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                          />
                          {book.salePercent > 0 && (
                            <div className="absolute top-2 right-2">
                              <span
                                className="flex items-center justify-center w-10 h-10 rounded-full text-[11px] font-bold text-white shadow-md"
                                style={{ background: '#ff3b30' }}
                              >
                                -{book.salePercent}%
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Tên sách */}
                        <h3
                          className="text-[13px] font-medium line-clamp-2 leading-snug mb-1.5 transition-colors"
                          style={{ color: T.text }}
                          onMouseEnter={e => (e.currentTarget.style.color = T.accent)}
                          onMouseLeave={e => (e.currentTarget.style.color = T.text)}
                        >
                          {book.title}
                        </h3>

                        {/* Giá */}
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-[13px] font-bold" style={{ color: T.accent }}>
                            {salePrice.toLocaleString('vi-VN')}đ
                          </span>
                          {book.salePercent > 0 && (
                            <span className="text-[12px] line-through" style={{ color: T.sub }}>
                              {book.price.toLocaleString('vi-VN')}đ
                            </span>
                          )}
                        </div>
                      </Link>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>

        </div>
      </div>
    </div>
  );
}