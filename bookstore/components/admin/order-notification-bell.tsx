'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, Package, X, ExternalLink } from 'lucide-react'
import { useOrderNotification, OrderNotification } from '@/hooks/use-order-notification'
import { toast } from '@/hooks/use-toast'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

export function OrderNotificationBell() {
  const router = useRouter()
  const [open, setOpen] = useState(false)

  const { notifications, unreadCount, markAllRead, connected } = useOrderNotification({
    onNewOrder: (notification) => {
      // Hiện toast notification
      toast({
        title: '🔔 Đơn hàng mới!',
        description: notification.message,
        variant: 'default',
      })

      // Phát âm thanh thông báo (tùy chọn)
      playNotificationSound()
    },
    enabled: true,
  })

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen)
    if (isOpen) {
      markAllRead()
    }
  }

  const handleViewOrder = (orderId: number) => {
    setOpen(false)
    router.push(`/admin/orders?highlight=${orderId}`)
  }

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)

    if (diffMins < 1) return 'Vừa xong'
    if (diffMins < 60) return `${diffMins} phút trước`
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)} giờ trước`
    return date.toLocaleDateString('vi-VN')
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(price)
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white animate-pulse">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
          {/* Chấm xanh = đang kết nối */}
          <span
            className={`absolute bottom-0 right-0 h-2 w-2 rounded-full ${
              connected ? 'bg-green-500' : 'bg-gray-400'
            }`}
          />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-96 p-0" align="end">
        <div className="flex items-center justify-between p-4 pb-2">
          <h4 className="font-semibold text-sm">Thông báo đơn hàng</h4>
          {notifications.length > 0 && (
            <Button variant="ghost" size="sm" className="text-xs text-muted-foreground">
              Đánh dấu đã đọc
            </Button>
          )}
        </div>
        <Separator />

        <ScrollArea className="h-[400px]">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Package className="h-10 w-10 mb-3 opacity-50" />
              <p className="text-sm">Chưa có thông báo nào</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notif, index) => (
                <div
                  key={`${notif.orderId}-${index}`}
                  className="p-4 hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => handleViewOrder(notif.orderId)}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
                      <Package className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">
                          Đơn hàng #{notif.orderId}
                        </p>
                        <Badge variant="secondary" className="text-[10px]">
                          {notif.type === 'NEW_ORDER' ? 'Mới' : notif.type}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Khách: {notif.customerName} • {notif.customerPhone}
                      </p>
                      <div className="flex items-center justify-between mt-1">
                        <p className="text-xs font-semibold text-primary">
                          {formatPrice(notif.totalPrice)}
                        </p>
                        <span className="text-[10px] text-muted-foreground">
                          {formatTime(notif.createdAt)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 mt-1">
                        <span className="text-[10px] text-muted-foreground">
                          {notif.itemCount} sản phẩm • {notif.paymentMethod === 'QR_CODE' ? 'QR Code' : 'Tiền mặt'}
                        </span>
                      </div>
                    </div>
                    <ExternalLink className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-1" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {notifications.length > 0 && (
          <>
            <Separator />
            <div className="p-2">
              <Button
                variant="ghost"
                className="w-full text-xs"
                onClick={() => {
                  setOpen(false)
                  router.push('/admin/orders')
                }}
              >
                Xem tất cả đơn hàng
              </Button>
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  )
}

// Hàm phát âm thanh thông báo
function playNotificationSound() {
  try {
    const audio = new Audio('/sounds/notification.mp3')
    audio.volume = 0.5
    audio.play().catch(() => {
      // Browser chặn autoplay — bỏ qua lỗi
    })
  } catch {
    // Không có file âm thanh — bỏ qua
  }
}