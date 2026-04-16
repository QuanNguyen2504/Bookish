'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Search,
  ShoppingCart,
  User,
  Menu,
  X,
  LogOut,
  Settings,
  Package,
  ChevronDown,
  BookOpen,
  Heart,
} from 'lucide-react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuthStore } from '@/lib/store/auth-store';
import { useCartStore } from '@/lib/store/cart-store';
import { categoryApi, CategoryResponse } from '@/lib/api/category-api';

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

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [categories, setCategories] = useState<CategoryResponse[]>([]);

  useEffect(() => {
    categoryApi.getAll()
      .then(setCategories)
      .catch(() => setCategories([]));
  }, []);

  const { user, isAuthenticated, logout } = useAuthStore();
  const totalItems = useCartStore(state => state.totalItems());

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/shop?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
    }
  };

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  const navLinks = [
    { href: '/', label: 'Trang chủ' },
    { href: '/shop', label: 'Cửa hàng' },
  ];

  return (
    <>
      <header
        className="sticky top-0 z-50 w-full"
        style={{
          background: 'rgba(251, 251, 253, 0.85)',
          backdropFilter: 'saturate(180%) blur(20px)',
          WebkitBackdropFilter: 'saturate(180%) blur(20px)',
          borderBottom: '1px solid rgba(0, 0, 0, 0.08)',
        }}
      >
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="relative flex items-center justify-between h-16 gap-4">

            {/* Logo */}
            <Link
              href="/"
              className="text-[22px] font-semibold tracking-[-0.022em] text-[#1d1d1f] shrink-0"
              style={{ letterSpacing: '-0.022em' }}
            >
              Bookish
            </Link>

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center gap-8 shrink-0">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-[16px] transition-opacity"
                  style={{
                    color: '#1d1d1f',
                    opacity: pathname === link.href ? 1 : 0.72,
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
                  onMouseLeave={(e) => (e.currentTarget.style.opacity = pathname === link.href ? '1' : '0.72')}
                >
                  {link.label}
                </Link>
              ))}

              {/* Danh mục dropdown */}
              <div
                className="relative"
                onMouseEnter={() => setIsCategoryOpen(true)}
                onMouseLeave={() => setIsCategoryOpen(false)}
              >
                <button
                  className="flex items-center gap-0.5 text-[16px] transition-opacity"
                  style={{ color: '#1d1d1f', opacity: 0.72 }}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.opacity = '1')}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.opacity = '0.72')}
                >
                  Danh mục
                  <motion.span animate={{ rotate: isCategoryOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
                    <ChevronDown className="h-3 w-3 ml-0.5" />
                  </motion.span>
                </button>

                <AnimatePresence>
                  {isCategoryOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 6, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 6, scale: 0.98 }}
                      transition={{ duration: 0.15 }}
                      className="absolute top-full left-1/2 -translate-x-1/2 mt-4 w-52 rounded-2xl overflow-hidden"
                      style={{
                        background: 'rgba(255,255,255,0.95)',
                        backdropFilter: 'blur(20px)',
                        WebkitBackdropFilter: 'blur(20px)',
                        boxShadow: '0 4px 30px rgba(0,0,0,0.12)',
                        border: '1px solid rgba(0,0,0,0.06)',
                      }}
                    >
                      <div className="py-2">
                        <Link
                          href="/shop"
                          className="flex items-center gap-3 px-4 py-2.5 text-[13px] transition-colors"
                          style={{ color: '#1d1d1f' }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(0,0,0,0.04)')}
                          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                        >
                          <BookOpen className="h-3.5 w-3.5 opacity-60" />
                          <span>Tất cả sách</span>
                        </Link>
                        <div className="h-px mx-3 my-1" style={{ background: 'rgba(0,0,0,0.08)' }} />
                        {categories.map((cat) => (
                          <Link
                            key={cat.id}
                            href={`/shop?category=${toSlug(cat.name)}`}
                            className="block px-4 py-2 text-[13px] transition-colors"
                            style={{ color: '#1d1d1f' }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(0,0,0,0.04)')}
                            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                          >
                            {cat.name}
                          </Link>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </nav>

            {/* Search */}
            <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-xs">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 pointer-events-none" style={{ color: '#6e6e73' }} />
                <input
                  type="search"
                  placeholder="Tìm kiếm sách, tác giả..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 rounded-xl text-[13px] outline-none"
                  style={{
                    background: 'rgba(0,0,0,0.06)',
                    color: '#1d1d1f',
                    border: 'none',
                  }}
                />
              </div>
            </form>

            {/* Right Actions */}
            <div className="flex items-center gap-4">

              {/*  Wishlist — chỉ hiện khi đã login */}
              {isAuthenticated && (
                <Link
                  href="/wishlist"
                  className="flex items-center transition-opacity"
                  style={{ color: '#1d1d1f', opacity: 0.72 }}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.opacity = '1')}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.opacity = '0.72')}
                  title="Danh sách yêu thích"
                >
                  <Heart className="h-5 w-5" />
                </Link>
              )}

              {/* Cart */}
              <Link href="/cart" className="relative flex items-center transition-opacity"
                style={{ color: '#1d1d1f', opacity: 0.72 }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.opacity = '1')}
                onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.opacity = '0.72')}
              >
                <ShoppingCart className="h-5 w-5" />
                {totalItems > 0 && (
                  <span
                    className="absolute -top-1.5 -right-1.5 h-4 w-4 text-[10px] font-bold rounded-full flex items-center justify-center text-white"
                    style={{ background: '#0071e3' }}
                  >
                    {totalItems > 9 ? '9+' : totalItems}
                  </span>
                )}
              </Link>

              {/* User */}
              {isAuthenticated && user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center transition-opacity" style={{ opacity: 0.72 }}
                      onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.opacity = '1')}
                      onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.opacity = '0.72')}
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user.avatarUrl ?? ''} alt={user.username} />
                        <AvatarFallback
                          className="text-[10px] font-semibold text-white"
                          style={{ background: '#0071e3' }}
                        >
                          {user.username.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 rounded-2xl" style={{ border: '1px solid rgba(0,0,0,0.08)' }}>
                    <div className="px-3 py-2">
                      <p className="text-[13px] font-semibold text-foreground">{user.username}</p>
                      <p className="text-[12px] text-muted-foreground capitalize">{user.role.toLowerCase()}</p>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/profile" className="cursor-pointer text-[13px]">
                        <User className="mr-2 h-3.5 w-3.5" /> Hồ sơ cá nhân
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/wishlist" className="cursor-pointer text-[13px]">
                        <Heart className="mr-2 h-3.5 w-3.5" /> Sách yêu thích
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/profile?tab=orders" className="cursor-pointer text-[13px]">
                        <Package className="mr-2 h-3.5 w-3.5" /> Đơn hàng của tôi
                      </Link>
                    </DropdownMenuItem>
                    {user.role === 'ADMIN' && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                          <Link href="/admin" className="cursor-pointer text-[13px]">
                            <Settings className="mr-2 h-3.5 w-3.5" /> Quản trị viên
                          </Link>
                        </DropdownMenuItem>
                      </>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive cursor-pointer text-[13px]">
                      <LogOut className="mr-2 h-3.5 w-3.5" /> Đăng xuất
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <div className="hidden sm:flex items-center gap-3">
                  <Link
                    href="/login"
                    className="text-[16px] transition-opacity"
                    style={{ color: '#0071e3', opacity: 1 }}
                    onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.8')}
                    onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
                  >
                    Đăng nhập
                  </Link>
                  <Link
                    href="/register"
                    className="text-[15px] px-5 py-2 rounded-full text-white font-medium transition-opacity"
                    style={{ background: '#1d1d1f' }}
                    onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.opacity = '0.85')}
                    onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.opacity = '1')}
                  >
                    Đăng ký
                  </Link>
                </div>
              )}

              {/* Mobile Menu Button */}
              <button
                className="md:hidden flex items-center transition-opacity"
                style={{ color: '#1d1d1f', opacity: 0.72 }}
                onClick={() => setIsMenuOpen(!isMenuOpen)}
              >
                {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden overflow-hidden"
              style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}
            >
              <nav className="max-w-[1200px] mx-auto px-6 py-4 flex flex-col gap-1">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setIsMenuOpen(false)}
                    className="px-3 py-2.5 rounded-xl text-[15px] transition-colors"
                    style={{
                      color: '#1d1d1f',
                      background: pathname === link.href ? 'rgba(0,0,0,0.05)' : 'transparent',
                    }}
                  >
                    {link.label}
                  </Link>
                ))}

                {/*  Link wishlist trong mobile menu */}
                {isAuthenticated && (
                  <Link
                    href="/wishlist"
                    onClick={() => setIsMenuOpen(false)}
                    className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-[15px] transition-colors"
                    style={{ color: '#1d1d1f' }}
                  >
                    <Heart className="h-4 w-4" />
                    Sách yêu thích
                  </Link>
                )}

                <div className="px-3 pt-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: '#6e6e73' }}>Danh mục</p>
                  <div className="flex flex-col gap-0.5">
                    {categories.map((cat) => (
                      <Link
                        key={cat.id}
                        href={`/shop?category=${toSlug(cat.name)}`}
                        onClick={() => setIsMenuOpen(false)}
                        className="py-2 text-[14px] transition-colors"
                        style={{ color: '#1d1d1f' }}
                      >
                        {cat.name}
                      </Link>
                    ))}
                  </div>
                </div>

                {!isAuthenticated && (
                  <div className="flex gap-3 mt-4 pt-4" style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}>
                    <Link
                      href="/login"
                      onClick={() => setIsMenuOpen(false)}
                      className="flex-1 text-center py-2.5 rounded-xl text-[15px] font-medium transition-colors"
                      style={{ border: '1px solid rgba(0,0,0,0.2)', color: '#1d1d1f' }}
                    >
                      Đăng nhập
                    </Link>
                    <Link
                      href="/register"
                      onClick={() => setIsMenuOpen(false)}
                      className="flex-1 text-center py-2.5 rounded-xl text-[15px] font-medium text-white"
                      style={{ background: '#1d1d1f' }}
                    >
                      Đăng ký
                    </Link>
                  </div>
                )}
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </header>
    </>
  );
}