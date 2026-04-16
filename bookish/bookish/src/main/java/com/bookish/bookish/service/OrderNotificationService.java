package com.bookish.bookish.service;

import com.bookish.bookish.dto.response.OrderNotification;
import com.bookish.bookish.entity.Order;
import com.bookish.bookish.entity.OrderItem;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class OrderNotificationService {

    private final SimpMessagingTemplate messagingTemplate;

    public void notifyNewOrder(Order order, List<OrderItem> items) {
        OrderNotification notification = OrderNotification.builder()
                .orderId(order.getOrderId())
                .customerName(order.getUser().getUsername())
                .customerPhone(order.getPhone())
                .totalPrice(order.getTotalPrice())
                .paymentMethod(order.getPaymentMethod())
                .shippingAddress(order.getShippingAddress())
                .itemCount(items.size())
                .createdAt(order.getCreatedAt())
                .type("NEW_ORDER")
                .message("Đơn hàng mới #" + order.getOrderId() + " từ " + order.getUser().getUsername())
                .build();

        // Gửi đến tất cả admin/staff đang subscribe channel /topic/admin/orders
        messagingTemplate.convertAndSend("/topic/admin/orders", notification);
    }

    public void notifyOrderStatusChanged(Order order, String oldStatus, String newStatus) {
        OrderNotification notification = OrderNotification.builder()
                .orderId(order.getOrderId())
                .customerName(order.getUser().getUsername())
                .totalPrice(order.getTotalPrice())
                .type("STATUS_CHANGED")
                .message("Đơn #" + order.getOrderId() + ": " + oldStatus + " → " + newStatus)
                .createdAt(order.getCreatedAt())
                .build();

        messagingTemplate.convertAndSend("/topic/admin/orders", notification);
    }
}