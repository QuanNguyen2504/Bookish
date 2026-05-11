package com.bookish.bookish.service;

import com.bookish.bookish.entity.Book;
import com.bookish.bookish.entity.Order;
import com.bookish.bookish.entity.OrderItem;
import com.bookish.bookish.repository.BookRepository;
import com.bookish.bookish.repository.OrderItemRepository;
import com.bookish.bookish.repository.OrderRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class OrderExpiryScheduler {

    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;
    private final BookRepository bookRepository; // FIX 4: thêm để hoàn kho

    // Chạy mỗi 30 giây
    @Scheduled(fixedRate = 30000)
    @Transactional
    public void cancelExpiredQrOrders() {
        LocalDateTime expiry = LocalDateTime.now().minusMinutes(4);
        List<Order> expired = orderRepository
                .findByStatusAndPaymentMethodAndCreatedAtBefore("PENDING", "QR_CODE", expiry);

        for (Order order : expired) {

            log.info("Auto-cancelling expired QR order #{} (created: {})",
                    order.getOrderId(), order.getCreatedAt());

            order.setStatus("CANCELLED");
            orderRepository.save(order);

            log.info("Order #{} cancelled. Stock NOT restored because QR orders " +
                            "only deduct stock after payment confirmed (status PROCESSING).",
                    order.getOrderId());
        }

        if (!expired.isEmpty()) {
            log.info("Cancelled {} expired QR orders", expired.size());
        }
    }
}

/*
 * GIẢI THÍCH LUỒNG KHO CHO BẢO VỆ:
 *
 * Luồng QR_CODE:
 *   1. User đặt hàng  → Order(status=PENDING)  — Kho CHƯA trừ
 *   2. User quét QR   → SePay gọi webhook       — confirmPayment()
 *   3. confirmPayment → deductStock()           — Kho BỊ trừ → status=PROCESSING
 *   4. Admin giao hàng → status=SHIPPING
 *   5. User nhận hàng → status=DELIVERED        — Kho đã trừ từ bước 3
 *
 * Nếu QR hết hạn (scheduler):
 *   - Order vẫn PENDING → kho CHƯA trừ → KHÔNG cần hoàn kho
 *   - Chỉ cần set CANCELLED là đủ
 *
 * Trường hợp duy nhất cần hoàn kho là adminCancelOrder() khi status=PROCESSING
 * (đã thanh toán QR, đã trừ kho, admin hủy thủ công) — đã xử lý trong OrderService.
 */
