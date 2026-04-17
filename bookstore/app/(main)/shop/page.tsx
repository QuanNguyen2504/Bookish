'use client';

import { useState, useMemo, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, SlidersHorizontal, X, Grid3X3, LayoutList } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { BookCard } from '@/components/book-card';
import { bookApi, type BookResponse, type PageData } from '@/lib/api/book-api';
import { Book } from '@/lib/types';
import {
  Pagination, PaginationContent, PaginationEllipsis,
  PaginationItem, PaginationLink, PaginationNext, PaginationPrevious,
} from '@/components/ui/pagination';


const PAGE_SIZE = 12;

function getPageNumbers(current: number, total: number): (number | '...')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | '...')[] = [1];
  if (current > 3) pages.push('...');
  for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) pages.push(i);
  if (current < total - 2) pages.push('...');
  pages.push(total);
  return pages;
}

function PaginationBar({ currentPage, totalPages, onPageChange }: {
  currentPage: number; totalPages: number; onPageChange: (p: number) => void;
}) {
  if (totalPages <= 1) return null;
  return (
    <Pagination className="mt-8">
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious href="#"
            onClick={(e) => { e.preventDefault(); if (currentPage > 1) onPageChange(currentPage - 1); }}
            className={currentPage === 1 ? 'pointer-events-none opacity-40' : ''} />
        </PaginationItem>
        {getPageNumbers(currentPage, totalPages).map((page, i) => (
          <PaginationItem key={i}>
            {page === '...' ? <PaginationEllipsis /> : (
              <PaginationLink href="#" isActive={page === currentPage}
                onClick={(e) => { e.preventDefault(); onPageChange(page as number); }}>
                {page}
              </PaginationLink>
            )}
          </PaginationItem>
        ))}
        <PaginationItem>
          <PaginationNext href="#"
            onClick={(e) => { e.preventDefault(); if (currentPage < totalPages) onPageChange(currentPage + 1); }}
            className={currentPage === totalPages ? 'pointer-events-none opacity-40' : ''} />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}

function toSlug(str: string): string {
  return str.toLowerCase().trim().normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd')
    .replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-')
    .replace(/-+/g, '-').replace(/^-+|-+$/g, '');
}

function mapToBook(b: BookResponse): Book {
  const salePrice = b.salePercent > 0 ? Math.round(b.price * (1 - b.salePercent / 100)) : b.price;
  const categoryList = b.categories ?? [];
  const categoryName = categoryList[0] ?? 'Chưa phân loại';
  const allCategories = categoryList.filter((n) => n && n.trim() !== '').map((n) => ({ name: n.trim(), slug: toSlug(n) }));
  return {
    id: String(b.bookId), title: b.title, description: b.description ?? '',
    price: salePrice, originalPrice: b.salePercent > 0 ? b.price : undefined,
    image: b.image || 'https://picsum.photos/id/24/400/600',
    stock: b.stock, rating: b.avgRating ?? 0, reviewCount: b.reviewCount ?? 0,
    publishYear: 0, pages: 0, isbn: '',
    author: { id: '', name: b.authors?.join(', ') ?? 'Không rõ', bio: '', avatar: '', bookCount: 0 },
    category: { id: '', name: categoryName, slug: toSlug(categoryName), description: '', bookCount: 0 },
    allCategories,
  };
}

interface CategoryItem { id?: number; slug: string; name: string }

function CategorySidebar({ categories, selectedCategory, loading, onSelect }: {
  categories: CategoryItem[];
  selectedCategory: string;
  loading: boolean;
  onSelect: (slug: string) => void;
}) {
  return (
    <div>
      <button onClick={() => onSelect('')}
        className="w-full flex items-center px-3 py-2 rounded-lg text-[14px] transition-colors mb-0.5"
        style={{ background: !selectedCategory ? 'rgba(0,113,227,0.1)' : 'transparent', color: !selectedCategory ? '#0071e3' : '#1d1d1f', fontWeight: !selectedCategory ? '600' : '400' }}>
        Tất cả sách
      </button>
      {loading
        ? <div className="space-y-2 px-3 mt-2">{[...Array(5)].map((_, i) => <div key={i} className="h-4 rounded animate-pulse" style={{ background: '#e8e8ed' }} />)}</div>
        : categories.map((cat) => (
          <button key={cat.slug} onClick={() => onSelect(cat.slug)}
            className="w-full flex items-center px-3 py-2 rounded-lg text-[14px] transition-colors mb-0.5"
            style={{ background: selectedCategory === cat.slug ? 'rgba(0,113,227,0.1)' : 'transparent', color: selectedCategory === cat.slug ? '#0071e3' : '#1d1d1f', fontWeight: selectedCategory === cat.slug ? '600' : '400' }}>
            {cat.name}
          </button>
        ))
      }
    </div>
  );
}

function ShopContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const urlQuery = searchParams.get('q') || '';
  const urlCategory = searchParams.get('category') || '';

  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('default');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  // Danh mục: load từ API categories
  const [apiCategories, setApiCategories] = useState<CategoryItem[]>([]);
  const [catLoading, setCatLoading] = useState(true);

  useEffect(() => {
    const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
    (async () => {
      try {
        const res = await fetch(`${API}/categories`);
        const json = await res.json();
        const cats = json.data ?? json; // ApiResponse wrapper hoặc mảng trực tiếp
        setApiCategories((cats as any[]).map((c: any) => ({
          id: c.categoryId ?? c.id,
          slug: toSlug(c.name),
          name: c.name,
        })));
      } catch {
        // Fallback: load sách rồi trích danh mục
        try {
          const all = await bookApi.getAll();
          const map = new Map<string, string>();
          all.forEach((b) => (b.categories ?? []).forEach((n) => {
            if (n && n.trim()) map.set(toSlug(n), n.trim());
          }));
          setApiCategories(Array.from(map.entries()).map(([slug, name]) => ({ slug, name })));
        } catch { /* empty */ }
      } finally {
        setCatLoading(false);
      }
    })();
  }, []);

  // Tìm categoryId từ slug
  const selectedCategoryId = useMemo(() => {
    if (!urlCategory) return undefined;
    const found = apiCategories.find((c) => c.slug === urlCategory);
    return found?.id;
  }, [urlCategory, apiCategories]);

  // Map sortBy frontend → backend sort param
  const apiSort = useMemo(() => {
    switch (sortBy) {
      case 'price-asc': return 'price_asc';
      case 'price-desc': return 'price_desc';
      default: return 'newest';
    }
  }, [sortBy]);

  // Fetch sách phân trang từ server
  const fetchBooks = useCallback(async () => {
    setLoading(true);
    try {
      const data = await bookApi.getActivePaged({
        page: currentPage - 1, // API 0-based, UI 1-based
        size: PAGE_SIZE,
        keyword: urlQuery || undefined,
        categoryId: selectedCategoryId,
        sort: apiSort,
      });
      setBooks(data.content.map(mapToBook));
      setTotalPages(data.totalPages);
      setTotalElements(data.totalElements);
    } catch {
      setBooks([]);
      setTotalPages(0);
      setTotalElements(0);
    } finally {
      setLoading(false);
    }
  }, [currentPage, urlQuery, selectedCategoryId, apiSort]);

  useEffect(() => { fetchBooks(); }, [fetchBooks]);

  // Reset page khi đổi filter/sort
  useEffect(() => { setCurrentPage(1); }, [urlQuery, urlCategory, sortBy]);

  const handleSelectCategory = (slug: string) => {
    router.push(slug ? `/shop?category=${encodeURIComponent(slug)}` : '/shop');
    setIsFilterOpen(false);
  };

  const handlePageChange = (p: number) => {
    setCurrentPage(p);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getCategoryName = (slug: string) => apiCategories.find((c) => c.slug === slug)?.name ?? slug;

  return (
    <div className="min-h-screen" style={{ background: '#f5f5f7' }}>
      <div className="max-w-[1200px] mx-auto px-6 py-8">
        <div className="flex gap-6">
          {/* Sidebar */}
          <aside className="hidden lg:block w-52 flex-shrink-0">
            <div className="sticky top-20 rounded-2xl overflow-hidden" style={{ border: '1px solid #d2d2d7' }}>
              <div className="px-4 py-3" style={{ background: 'linear-gradient(135deg, #0a1628, #0d2b5e)' }}>
                <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: 'rgba(96,165,250,0.9)' }}>Danh mục</p>
              </div>
              <div className="py-2 px-2" style={{ background: '#ffffff' }}>
                <CategorySidebar categories={apiCategories} selectedCategory={urlCategory} loading={catLoading} onSelect={handleSelectCategory} />
              </div>
            </div>
          </aside>

          {/* Main */}
          <div className="flex-1 min-w-0">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-5 rounded-2xl px-5 py-3.5" style={{ background: '#ffffff', border: '1px solid #d2d2d7' }}>
              <div className="flex items-center gap-3">
                <Sheet open={isFilterOpen} onOpenChange={setIsFilterOpen}>
                  <SheetTrigger asChild>
                    <button className="lg:hidden flex items-center gap-2 px-4 py-2 rounded-full text-[13px] font-medium"
                      style={{ border: '1px solid #d2d2d7', color: '#1d1d1f', background: urlCategory ? 'rgba(0,113,227,0.08)' : 'transparent' }}>
                      <SlidersHorizontal className="h-4 w-4" /> Danh mục
                      {urlCategory && <span className="h-5 w-5 rounded-full text-white text-[10px] flex items-center justify-center" style={{ background: '#0071e3' }}>1</span>}
                    </button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-72 p-0">
                    <SheetHeader className="p-5 border-b" style={{ borderColor: '#d2d2d7' }}>
                      <SheetTitle className="text-[17px] font-semibold" style={{ color: '#1d1d1f' }}>Danh mục</SheetTitle>
                    </SheetHeader>
                    <div className="p-3 mt-2">
                      <CategorySidebar categories={apiCategories} selectedCategory={urlCategory} loading={catLoading} onSelect={handleSelectCategory} />
                    </div>
                  </SheetContent>
                </Sheet>
                <span className="text-[14px]" style={{ color: '#6e6e73' }}>
                  <span className="font-semibold" style={{ color: '#1d1d1f' }}>{totalElements}</span> sách
                  {totalPages > 1 && (
                    <span> — trang {currentPage}/{totalPages}</span>
                  )}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}
                  className="text-[13px] px-3 py-2 rounded-lg outline-none cursor-pointer"
                  style={{ border: '1px solid #d2d2d7', color: '#1d1d1f', background: '#ffffff' }}>
                  <option value="default">Mới nhất</option>
                  <option value="price-asc">Giá: Thấp → Cao</option>
                  <option value="price-desc">Giá: Cao → Thấp</option>
                </select>
                <div className="hidden sm:flex items-center gap-1 p-1 rounded-lg" style={{ background: '#f5f5f7' }}>
                  {([['grid', Grid3X3], ['list', LayoutList]] as [string, any][]).map(([mode, Icon]) => (
                    <button key={mode} onClick={() => setViewMode(mode as 'grid' | 'list')}
                      className="p-1.5 rounded-md transition-all"
                      style={{ background: viewMode === mode ? '#ffffff' : 'transparent', color: viewMode === mode ? '#1d1d1f' : '#6e6e73', boxShadow: viewMode === mode ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}>
                      <Icon className="h-4 w-4" />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Active filters */}
            {(urlCategory || urlQuery) && (
              <div className="flex flex-wrap gap-2 mb-4">
                {urlCategory && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-medium" style={{ background: 'rgba(0,113,227,0.1)', color: '#0071e3' }}>
                    {getCategoryName(urlCategory)}
                    <button onClick={() => router.push('/shop')}><X className="h-3 w-3" /></button>
                  </span>
                )}
                {urlQuery && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-medium" style={{ background: 'rgba(0,113,227,0.1)', color: '#0071e3' }}>
                    Tìm: &quot;{urlQuery}&quot;
                    <button onClick={() => router.push('/shop')}><X className="h-3 w-3" /></button>
                  </span>
                )}
              </div>
            )}

            {/* Books */}
            {loading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="flex flex-col gap-3">
                    <div className="aspect-[3/4] rounded-2xl animate-pulse" style={{ background: '#e8e8ed' }} />
                    <div className="h-3 rounded-full w-3/4 animate-pulse" style={{ background: '#e8e8ed' }} />
                    <div className="h-3 rounded-full w-1/2 animate-pulse" style={{ background: '#e8e8ed' }} />
                  </div>
                ))}
              </div>
            ) : books.length > 0 ? (
              <AnimatePresence mode="wait">
                <motion.div key={`books-${currentPage}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className={viewMode === 'grid' ? 'grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-5' : 'space-y-3'}>
                  {books.map((book, i) => <BookCard key={book.id} book={book} index={i} />)}
                </motion.div>
              </AnimatePresence>
            ) : (
              <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-24">
                <div className="w-20 h-20 mx-auto mb-5 rounded-full flex items-center justify-center" style={{ background: '#e8e8ed' }}>
                  <Search className="h-9 w-9" style={{ color: '#6e6e73' }} />
                </div>
                <h3 className="text-[19px] font-semibold mb-2" style={{ color: '#1d1d1f' }}>Không tìm thấy sách</h3>
                <p className="text-[15px] mb-6" style={{ color: '#6e6e73' }}>Thử thay đổi danh mục hoặc từ khóa</p>
                <button onClick={() => router.push('/shop')} className="px-6 py-2.5 rounded-full text-[15px] font-medium text-white" style={{ background: '#0071e3' }}>
                  Xem tất cả
                </button>
              </motion.div>
            )}

            {!loading && <PaginationBar currentPage={currentPage} totalPages={totalPages} onPageChange={handlePageChange} />}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ShopPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#f5f5f7' }}>
        <div className="h-8 w-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#0071e3', borderTopColor: 'transparent' }} />
      </div>
    }>
      <ShopContent />
    </Suspense>
  );
}