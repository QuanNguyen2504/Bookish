'use client';

import { useEffect, useState, useCallback } from 'react';
import { Bell } from 'lucide-react';
import { notificationApi, NotificationData } from '@/lib/api/notification-api';
import { useAuthStore } from '@/lib/store/auth-store';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

interface NotificationBellProps {
  theme?: 'light' | 'dark';
}

export function NotificationBell({ theme = 'light' }: NotificationBellProps) {
  const { token } = useAuthStore();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchData = useCallback(async () => {
    if (!token) return;
    try {
      const [list, count] = await Promise.all([
        notificationApi.getMyNotifications(token),
        notificationApi.getUnreadCount(token),
      ]);
      setNotifications(list);
      setUnreadCount(count);
    } catch {
      // Bỏ qua lỗi network
    }
  }, [token]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleOpen = async (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen && unreadCount > 0 && token) {
      await notificationApi.markAllAsRead(token);
      setUnreadCount(0);
    }
  };

  const formatTime = (dateStr: string) => {
    const diffMins = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
    if (diffMins < 1) return 'Vừa xong';
    if (diffMins < 60) return `${diffMins} phút trước`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)} giờ trước`;
    return new Date(dateStr).toLocaleDateString('vi-VN');
  };

  const isDark = theme === 'dark';

  return (
    <Popover open={open} onOpenChange={handleOpen}>
      <PopoverTrigger asChild>
        <button
          className="relative p-1.5 rounded-lg transition-colors"
          style={{ color: isDark ? 'rgba(255,255,255,0.65)' : undefined }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background = isDark
              ? 'rgba(255,255,255,0.08)'
              : 'rgba(0,0,0,0.05)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = 'transparent';
          }}
        >
          <Bell className="h-[18px] w-[18px]" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent className="w-80 p-0" align="end" side="bottom">
        <div className="px-4 py-3">
          <h4 className="font-semibold text-sm">Thông báo</h4>
        </div>
        <Separator />
        <ScrollArea className="h-[320px]">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
              <Bell className="h-8 w-8 mb-2 opacity-40" />
              <p className="text-sm">Chưa có thông báo</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className={`px-4 py-3 hover:bg-muted/50 transition-colors ${!n.isRead ? 'bg-primary/5' : ''}`}
                >
                  <p className="text-sm font-medium leading-snug">{n.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{n.message}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">{formatTime(n.createdAt)}</p>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
