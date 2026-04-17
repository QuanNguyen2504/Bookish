package com.bookish.bookish.controller;

import com.bookish.bookish.dto.request.BulkConfirmRequest;
import com.bookish.bookish.dto.response.BulkConfirmResponse;
import com.bookish.bookish.dto.response.OrderResponse;
import com.bookish.bookish.dto.response.PageResponse;
import com.bookish.bookish.service.AdminOrderService;
import com.bookish.bookish.service.OrderService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/orders")
@RequiredArgsConstructor
public class AdminOrderController {

    private final AdminOrderService adminOrderService;
    private final OrderService orderService;

    @GetMapping
    public ResponseEntity<List<OrderResponse>> getAllOrders() {
        return ResponseEntity.ok(adminOrderService.getAllOrders());
    }

    @PatchMapping("/{orderId}/status")
    public ResponseEntity<OrderResponse> updateStatus(
            @PathVariable Integer orderId,
            @RequestParam String status) {
        return ResponseEntity.ok(adminOrderService.updateStatus(orderId, status));
    }


    @PatchMapping("/{orderId}/cancel")
    public ResponseEntity<OrderResponse> adminCancelOrder(@PathVariable Integer orderId) {
        return ResponseEntity.ok(orderService.adminCancelOrder(orderId));
    }


    @PostMapping("/bulk-confirm")
    public ResponseEntity<BulkConfirmResponse> bulkConfirm(
            @RequestBody(required = false) BulkConfirmRequest req) {
        List<Integer> ids = (req == null) ? null : req.getOrderIds();
        return ResponseEntity.ok(orderService.bulkConfirm(ids));
    }


    @PostMapping("/bulk-ship")
    public ResponseEntity<BulkConfirmResponse> bulkShip(
            @RequestBody(required = false) BulkConfirmRequest req) {
        List<Integer> ids = (req == null) ? null : req.getOrderIds();
        return ResponseEntity.ok(orderService.bulkShip(ids));
    }

    @GetMapping("/page")
    public ResponseEntity<PageResponse<OrderResponse>> getOrdersPaged(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String status) {
        return ResponseEntity.ok(orderService.getOrdersPaged(status, page, size));
    }
}