'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  BookOpen, FolderTree,
  ShoppingCart, UserCircle, Ticket, BarChart3, LogOut, BookMarked,
  RotateCcw,
} from 'lucide-react';
import { useAuthStore } from '@/lib/store/auth-store';

const menuItems = [
  { title: 'Thống kê',            href: '/admin',            icon: BarChart3 },
  { title: 'Quản lý Sách',        href: '/admin/books',      icon: BookOpen },
  { title: 'Quản lý Danh mục',    href: '/admin/categories', icon: FolderTree },
  { title: 'Quản lý Tác giả',     href: '/admin/authors',    icon: BookMarked },
  { title: 'Quản lý Đơn hàng',    href: '/admin/orders',     icon: ShoppingCart },
  { title: 'Yêu cầu hoàn trả',    href: '/admin/returns',    icon: RotateCcw },
  { title: 'Quản lý Người dùng',  href: '/admin/users',      icon: UserCircle },
  { title: 'Quản lý Khuyến mãi',  href: '/admin/promotions', icon: Ticket },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useAuthStore();

  return (
    <aside
      className="fixed left-0 top-0 z-40 h-screen w-64 flex flex-col"
      style={{ background: '#0b1a2e', borderRight: '1px solid rgba(255,255,255,0.07)' }}
    >
      {/* Logo */}
      <div className="flex items-center gap-2.5 h-14 px-6" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <span className="text-[18px] font-bold tracking-[-0.02em] text-white">Bookish</span>
        <span className="text-[11px] px-1.5 py-0.5 rounded-md font-semibold" style={{ background: 'rgba(0,113,227,0.3)', color: '#60a5fa' }}>Admin</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        <p className="text-[10px] font-semibold uppercase tracking-widest px-3 mb-2" style={{ color: 'rgba(255,255,255,0.3)' }}>Menu</p>
        {menuItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href));
          return (
            <Link key={item.href} href={item.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium mb-0.5 transition-colors"
              style={{ background: isActive ? 'rgba(0,113,227,0.2)' : 'transparent', color: isActive ? '#60a5fa' : 'rgba(255,255,255,0.65)' }}
              onMouseEnter={(e) => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)'; }}
              onMouseLeave={(e) => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
            >
              <item.icon className="h-4 w-4 flex-shrink-0" />
              {item.title}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="p-3" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <button
          onClick={() => { logout(); router.push('/login'); }}
          className="flex w-full items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-colors"
          style={{ color: 'rgba(255,255,255,0.45)' }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#ff453a'; (e.currentTarget as HTMLElement).style.background = 'rgba(255,59,48,0.1)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.45)'; (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
        >
          <LogOut className="h-4 w-4" />
          Đăng xuất
        </button>
      </div>
    </aside>
  );
}