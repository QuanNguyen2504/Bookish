package com.bookish.bookish.controller;

import com.bookish.bookish.dto.request.CheckoutRequest;
import com.bookish.bookish.dto.request.UpdateOrderRequest;
import com.bookish.bookish.dto.response.OrderResponse;
import com.bookish.bookish.service.OrderService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/orders")
@RequiredArgsConstructor
public class OrderController {

    private final OrderService orderService;

    // POST /api/orders/checkout — Tạo đơn hàng
    @PostMapping("/checkout")
    public ResponseEntity<OrderResponse> checkout(
            @RequestAttribute("userId") Integer userId,
            @RequestBody CheckoutRequest req) {
        return ResponseEntity.ok(orderService.checkout(userId, req));
    }

    // GET /api/orders — Lấy danh sách đơn của user
    @GetMapping
    public ResponseEntity<List<OrderResponse>> getOrders(
            @RequestAttribute("userId") Integer userId) {
        return ResponseEntity.ok(orderService.getOrdersByUser(userId));
    }

    // GET /api/orders/{orderId} — Lấy chi tiết đơn hàng
    @GetMapping("/{orderId}")
    public ResponseEntity<OrderResponse> getOrder(
            @RequestAttribute("userId") Integer userId,
            @PathVariable Integer orderId) {
        return ResponseEntity.ok(orderService.getOrderById(userId, orderId));
    }

    // PATCH /api/orders/{orderId}/cancel — User hủy đơn (PENDING → CANCELLED)
    @PatchMapping("/{orderId}/cancel")
    public ResponseEntity<OrderResponse> cancelOrder(
            @RequestAttribute("userId") Integer userId,
            @PathVariable Integer orderId) {
        return ResponseEntity.ok(orderService.cancelOrder(userId, orderId));
    }

    // PATCH /api/orders/{orderId}/confirm-payment — SePay webhook gọi (PENDING → PROCESSING)
    @PatchMapping("/{orderId}/confirm-payment")
    public ResponseEntity<OrderResponse> confirmPayment(
            @PathVariable Integer orderId) {
        return ResponseEntity.ok(orderService.confirmPayment(orderId));
    }

    // PATCH /api/orders/{orderId}/confirm-shipping — Admin giao hàng (PROCESSING → SHIPPING + trừ kho)
    @PatchMapping("/{orderId}/confirm-shipping")
    public ResponseEntity<OrderResponse> confirmShipping(
            @PathVariable Integer orderId) {
        return ResponseEntity.ok(orderService.confirmShipping(orderId));
    }

    // PATCH /api/orders/{orderId}/confirm-delivered — User xác nhận nhận hàng (SHIPPING → DELIVERED)
    @PatchMapping("/{orderId}/confirm-delivered")
    public ResponseEntity<OrderResponse> confirmDelivered(
            @RequestAttribute("userId") Integer userId,
            @PathVariable Integer orderId) {
        return ResponseEntity.ok(orderService.confirmDelivered(userId, orderId));
    }

    // PATCH /api/orders/{orderId} — Cập nhật địa chỉ/SĐT đơn hàng
    @PatchMapping("/{orderId}")
    public ResponseEntity<OrderResponse> updateOrder(
            @RequestAttribute("userId") Integer userId,
            @PathVariable Integer orderId,
            @RequestBody UpdateOrderRequest req) {
        return ResponseEntity.ok(orderService.updateOrder(userId, orderId, req));
    }
}