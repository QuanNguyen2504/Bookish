// Tạo file mới: OrderExpiryScheduler.java
package com.bookish.bookish.service;

import com.bookish.bookish.entity.Order;
import com.bookish.bookish.repository.OrderRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Component
@RequiredArgsConstructor
public class OrderExpiryScheduler {

    private final OrderRepository orderRepository;

    // Chạy mỗi 30 giây
    @Scheduled(fixedRate = 30000)
    @Transactional
    public void cancelExpiredQrOrders() {
        LocalDateTime expiry = LocalDateTime.now().minusMinutes(4);
        List<Order> expired = orderRepository
                .findByStatusAndPaymentMethodAndCreatedAtBefore("PENDING", "QR_CODE", expiry);
        for (Order order : expired) {
            order.setStatus("CANCELLED");
            orderRepository.save(order);
        }
    }
}
