package com.bookish.bookish.controller;

import com.bookish.bookish.dto.request.BulkConfirmRequest;
import com.bookish.bookish.dto.response.BulkConfirmResponse;
import com.bookish.bookish.dto.response.OrderResponse;
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

    /**
     * 🔥 POST /api/admin/orders/bulk-confirm
     * Body: { "orderIds": [1, 2, 3] } hoặc {} để confirm tất cả CASH PENDING
     * PENDING → PROCESSING (trừ kho)
     */
    @PostMapping("/bulk-confirm")
    public ResponseEntity<BulkConfirmResponse> bulkConfirm(
            @RequestBody(required = false) BulkConfirmRequest req) {
        List<Integer> ids = (req == null) ? null : req.getOrderIds();
        return ResponseEntity.ok(orderService.bulkConfirm(ids));
    }

    /**
     *  POST /api/admin/orders/bulk-ship
     * Body: { "orderIds": [1, 2, 3] } hoặc {} để ship tất cả PROCESSING
     * PROCESSING → SHIPPING (không trừ kho, đã trừ ở bước trước)
     */
    @PostMapping("/bulk-ship")
    public ResponseEntity<BulkConfirmResponse> bulkShip(
            @RequestBody(required = false) BulkConfirmRequest req) {
        List<Integer> ids = (req == null) ? null : req.getOrderIds();
        return ResponseEntity.ok(orderService.bulkShip(ids));
    }
}