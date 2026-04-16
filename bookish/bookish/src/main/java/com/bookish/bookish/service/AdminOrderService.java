package com.bookish.bookish.service;

import com.bookish.bookish.dto.response.OrderItemResponse;
import com.bookish.bookish.dto.response.OrderResponse;
import com.bookish.bookish.entity.Order;
import com.bookish.bookish.entity.OrderItem;
import com.bookish.bookish.repository.OrderItemRepository;
import com.bookish.bookish.repository.OrderRepository;
import com.bookish.bookish.exception.AppException;
import com.bookish.bookish.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AdminOrderService {

    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;

    private static final List<String> VALID_STATUSES =
            List.of("PENDING", "CONFIRMED", "PROCESSING", "SHIPPING", "DELIVERED", "CANCELLED");

    @Transactional(readOnly = true)
    public List<OrderResponse> getAllOrders() {
        return orderRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(order -> toResponse(order, orderItemRepository.findByOrder(order)))
                .toList();
    }

    @Transactional
    public OrderResponse updateStatus(Integer orderId, String status) {
        if (!VALID_STATUSES.contains(status.toUpperCase())) {
            throw new AppException(ErrorCode.ORDER_INVALID_STATUS);
        }
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new AppException(ErrorCode.ORDER_NOT_FOUND));
        order.setStatus(status.toUpperCase());
        orderRepository.save(order);
        return toResponse(order, orderItemRepository.findByOrder(order));
    }

    private OrderResponse toResponse(Order order, List<OrderItem> items) {
        List<OrderItemResponse> itemResponses = items.stream().map(oi ->
                OrderItemResponse.builder()
                        .orderItemId(oi.getOrderItemId())
                        .bookId(oi.getBook().getBook_id())
                        .title(oi.getBook().getTitle())
                        .image(oi.getBook().getImage())
                        .quantity(oi.getQuantity())
                        .price(oi.getPrice())
                        .subtotal(oi.getPrice().multiply(BigDecimal.valueOf(oi.getQuantity())))
                        .build()
        ).toList();

        return OrderResponse.builder()
                .orderId(order.getOrderId())
                .status(order.getStatus())
                .shippingAddress(order.getShippingAddress())
                .phone(order.getPhone())
                .paymentMethod(order.getPaymentMethod())
                .shippingFee(order.getShippingFee())
                .totalPrice(order.getTotalPrice())
                .createdAt(order.getCreatedAt())
                .items(itemResponses)
                .build();
    }
}