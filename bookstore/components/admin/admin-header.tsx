'use client';

import { useAuthStore } from '@/lib/store/auth-store';
import { Search, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useRouter } from 'next/navigation';
import { NotificationBell } from '@/components/notification-bell';

interface AdminHeaderProps {
  onMenuClick?: () => void;
}

export function AdminHeader({ onMenuClick }: AdminHeaderProps) {
  const { user, logout } = useAuthStore();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <header
      className="fixed top-0 right-0 z-30 flex h-14 items-center px-5 left-0 lg:left-64"
      style={{
        background: 'rgba(255,255,255,0.97)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid #e5e7eb',
      }}
    >
      {/* Mobile menu button */}
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden shrink-0 mr-2"
        onClick={onMenuClick}
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Search */}
      <div className="relative w-64 shrink-0">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input
          type="search"
          placeholder="Tìm kiếm..."
          className="pl-9 h-9 bg-gray-50 border-gray-200 text-sm focus-visible:ring-1 focus-visible:bg-white"
        />
      </div>

      {/* Right section — đẩy về phía phải */}
      <div className="flex items-center gap-2 ml-auto">
        {/* Notifications */}
        <NotificationBell theme="light" />

        {/* Separator */}
        <div className="w-px h-5 bg-gray-200 mx-1" />

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="flex items-center gap-2.5 px-2.5 h-9 hover:bg-gray-100 rounded-lg"
            >
              <Avatar className="h-7 w-7">
                <AvatarImage src={user?.avatarUrl ?? undefined} alt={user?.username} />
                <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                  {user?.username?.charAt(0).toUpperCase() || 'A'}
                </AvatarFallback>
              </Avatar>
              <div className="hidden flex-col items-start md:flex leading-tight">
                <span className="text-sm font-semibold text-gray-800">{user?.username || 'Admin'}</span>
                <span className="text-[11px] text-gray-400">Quản trị viên</span>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Tài khoản</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push('/profile')}>
              Thông tin cá nhân
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push('/')}>
              Về trang chủ
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-destructive">
              Đăng xuất
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}