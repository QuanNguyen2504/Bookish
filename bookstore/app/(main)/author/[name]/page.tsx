'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, BookOpen, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { bookApi, BookResponse } from '@/lib/api/book-api';
import { authorApi, AuthorResponse } from '@/lib/api/author-api';

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

  // Lấy tất cả danh mục từ sách
  const allCategories = useMemo(() => {
    const set = new Set<string>();
    books.forEach((b) => b.categories?.forEach((c) => set.add(c)));
    return Array.from(set).sort();
  }, [books]);

  // Lọc sách theo danh mục
  const filteredBooks = useMemo(() => {
    if (!selectedCategory) return books;
    return books.filter((b) => b.categories?.includes(selectedCategory));
  }, [books, selectedCategory]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="h-10 w-10 rounded-full border-4 border-primary border-t-transparent"
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <BookOpen className="h-16 w-16 text-muted-foreground" />
        <p className="text-lg text-muted-foreground">{error}</p>
        <Button onClick={() => router.back()} variant="outline" className="rounded-full">
          <ArrowLeft className="mr-2 h-4 w-4" /> Quay lại
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">

        {/* Breadcrumb */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 text-sm text-muted-foreground mb-6"
        >
          <Link href="/" className="hover:text-primary transition-colors">Trang chủ</Link>
          <span>/</span>
          <Link href="/shop" className="hover:text-primary transition-colors">Cửa hàng</Link>
          <span>/</span>
          <span className="text-foreground font-medium">{authorName}</span>
        </motion.div>

        <div className="flex flex-col lg:flex-row gap-6 items-start">

          {/* ── Sidebar trái ── */}
          <motion.aside
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4 }}
            className="w-full lg:w-64 shrink-0 lg:sticky lg:top-8 flex flex-col gap-4"
          >

            {/* Thông tin tác giả */}
            <div className="border border-border rounded-xl overflow-hidden">
              <div className="bg-primary px-4 py-3">
                <h2 className="text-sm font-bold text-primary-foreground uppercase tracking-wide">
                  Tác giả
                </h2>
              </div>
              <div className="p-4 flex flex-col gap-2 bg-card">
                <p className="font-semibold text-foreground text-base">{authorName}</p>
                {author?.birthDate && (
                  <p className="text-xs text-muted-foreground">
                    Sinh: {new Date(author.birthDate).toLocaleDateString('vi-VN')}
                  </p>
                )}
                {author?.bio && (
                  <p className="text-xs text-muted-foreground leading-relaxed line-clamp-5">
                    {author.bio}
                  </p>
                )}
                <p className="text-xs font-medium text-primary mt-1">
                  {books.length} cuốn sách
                </p>
              </div>
            </div>

            {/* Danh mục */}
            {allCategories.length > 0 && (
              <div className="border border-border rounded-xl overflow-hidden">
                <button
                  onClick={() => setShowCategories((v) => !v)}
                  className="w-full flex items-center justify-between bg-primary px-4 py-3"
                >
                  <h2 className="text-sm font-bold text-primary-foreground uppercase tracking-wide">
                    Thể loại sách
                  </h2>
                  {showCategories
                    ? <ChevronUp className="h-4 w-4 text-primary-foreground" />
                    : <ChevronDown className="h-4 w-4 text-primary-foreground" />
                  }
                </button>

                <AnimatePresence initial={false}>
                  {showCategories && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden bg-card"
                    >
                      <ul className="py-2">
                        {/* Tất cả */}
                        <li>
                          <button
                            onClick={() => setSelectedCategory(null)}
                            className={`w-full text-left px-4 py-2 text-sm transition-colors flex items-center gap-2
                              ${!selectedCategory
                                ? 'text-primary font-semibold bg-primary/5'
                                : 'text-foreground hover:text-primary hover:bg-muted/50'
                              }`}
                          >
                            <span className={`w-2 h-2 rounded-full border ${!selectedCategory ? 'bg-primary border-primary' : 'border-muted-foreground'}`} />
                            Tất cả sản phẩm
                          </button>
                        </li>
                        {allCategories.map((cat) => (
                          <li key={cat}>
                            <button
                              onClick={() => setSelectedCategory(cat)}
                              className={`w-full text-left px-4 py-2 text-sm transition-colors flex items-center gap-2
                                ${selectedCategory === cat
                                  ? 'text-primary font-semibold bg-primary/5'
                                  : 'text-foreground hover:text-primary hover:bg-muted/50'
                                }`}
                            >
                              <span className={`w-2 h-2 rounded-full border ${selectedCategory === cat ? 'bg-primary border-primary' : 'border-muted-foreground'}`} />
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

            {/* Quay lại */}
            <Button
              variant="ghost"
              onClick={() => router.back()}
              className="text-muted-foreground hover:text-foreground w-full justify-start"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Quay lại
            </Button>
          </motion.aside>

          {/* ── Cột phải: Danh sách sách ── */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="flex-1 min-w-0"
          >
            {/* Header — chỉ hiện nút xóa bộ lọc khi đang lọc */}
            {selectedCategory && (
              <div className="flex items-center justify-end mb-4">
                <button
                  onClick={() => setSelectedCategory(null)}
                  className="text-xs text-muted-foreground hover:text-primary underline"
                >
                  Xóa bộ lọc
                </button>
              </div>
            )}

            {filteredBooks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 gap-4">
                <BookOpen className="h-16 w-16 text-muted-foreground" />
                <p className="text-muted-foreground">Không tìm thấy sách nào.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5">
                {filteredBooks.map((book, index) => {
                  const salePrice = book.price * (1 - (book.salePercent ?? 0) / 100);
                  return (
                    <motion.div
                      key={book.bookId}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.04 }}
                    >
                      <Link href={`/book/${book.bookId}`} className="group block">
                        {/* Ảnh bìa */}
                        <div className="relative aspect-[3/4] rounded-lg overflow-hidden shadow border border-border mb-3 bg-muted">
                          <Image
                            src={book.image || 'https://picsum.photos/id/24/400/600'}
                            alt={book.title}
                            fill
                            className="object-cover transition-transform duration-300 group-hover:scale-105"
                            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                          />
                          {book.salePercent > 0 && (
                            <div className="absolute top-2 right-2">
                              <span className="flex items-center justify-center w-10 h-10 rounded-full bg-accent text-accent-foreground text-xs font-bold shadow">
                                -{book.salePercent}%
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Tên sách */}
                        <h3 className="text-sm font-medium text-foreground line-clamp-2 group-hover:text-primary transition-colors leading-snug mb-2">
                          {book.title}
                        </h3>

                        {/* Giá */}
                        <div className="flex items-baseline gap-2">
                          <span className="text-sm font-bold text-primary">
                            {salePrice.toLocaleString('vi-VN')}đ
                          </span>
                          {book.salePercent > 0 && (
                            <span className="text-xs text-muted-foreground line-through">
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