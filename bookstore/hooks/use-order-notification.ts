'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Client, IMessage } from '@stomp/stompjs';

export interface OrderNotification {
  orderId: number;
  customerName: string;
  customerPhone: string;
  totalPrice: number;
  paymentMethod: string;
  shippingAddress: string;
  itemCount: number;
  createdAt: string;
  type: string;
  message: string;
}

interface UseOrderNotificationOptions {
  onNewOrder?: (notification: OrderNotification) => void;
  enabled?: boolean;
}

export function useOrderNotification({
  onNewOrder,
  enabled = true,
}: UseOrderNotificationOptions = {}) {
  const [connected, setConnected] = useState(false);
  const [notifications, setNotifications] = useState<OrderNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const clientRef = useRef<Client | null>(null);
  const onNewOrderRef = useRef(onNewOrder);

  // Giữ ref mới nhất để tránh re-create client khi callback thay đổi
  useEffect(() => {
    onNewOrderRef.current = onNewOrder;
  }, [onNewOrder]);

  useEffect(() => {
    if (!enabled) return;

    const client = new Client({
      // SockJS endpoint — dùng http, @stomp/stompjs tự wrap thành WebSocket
      webSocketFactory: () => new WebSocket('ws://localhost:8080/ws/websocket'),

      // Tắt debug khi production
      debug: (str) => {
        if (process.env.NODE_ENV === 'development') {
          console.log('[STOMP]', str);
        }
      },

      // Auto reconnect sau 5s nếu mất kết nối
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,

      onConnect: () => {
        setConnected(true);

        // Subscribe vào channel thông báo đơn hàng admin
        client.subscribe('/topic/admin/orders', (message: IMessage) => {
          const notification: OrderNotification = JSON.parse(message.body);
          setNotifications((prev) => [notification, ...prev]);
          setUnreadCount((prev) => prev + 1);

          if (onNewOrderRef.current) {
            onNewOrderRef.current(notification);
          }
        });
      },

      onDisconnect: () => {
        setConnected(false);
      },

      onStompError: (frame) => {
        console.error('[STOMP] Error:', frame.headers['message']);
        setConnected(false);
      },

      onWebSocketClose: () => {
        setConnected(false);
      },
    });

    client.activate();
    clientRef.current = client;

    return () => {
      client.deactivate();
      clientRef.current = null;
    };
  }, [enabled]);

  const markAllRead = useCallback(() => {
    setUnreadCount(0);
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
    setUnreadCount(0);
  }, []);

  return {
    connected,
    notifications,
    unreadCount,
    markAllRead,
    clearNotifications,
  };
}