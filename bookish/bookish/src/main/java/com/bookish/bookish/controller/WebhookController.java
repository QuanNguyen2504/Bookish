package com.bookish.bookish.controller;

import com.bookish.bookish.dto.request.SePayWebhookRequest;
import com.bookish.bookish.service.OrderService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Slf4j
@RestController
@RequestMapping("/api/webhook")
@RequiredArgsConstructor
public class WebhookController {

    private final OrderService orderService;

    /**
     * SePay gọi endpoint này mỗi khi có tiền vào tài khoản MB Bank.
     * Cấu hình trên SePay: Kiểu chứng thực = "Không cần chứng thực"
     */
    @PostMapping("/sepay")
    public ResponseEntity<Map<String, String>> handleSePay(
            @RequestBody SePayWebhookRequest payload) {

        log.info("SePay webhook: transferType={}, amount={}, content={}",
                payload.getTransferType(), payload.getTransferAmount(), payload.getContent());

        // Chỉ xử lý giao dịch tiền VÀO
        if (!"in".equalsIgnoreCase(payload.getTransferType())) {
            return ResponseEntity.ok(Map.of("status", "ignored"));
        }

        // Parse orderId từ nội dung CK — định dạng: "Bookish {orderId}"
        Integer orderId = parseOrderId(payload.getContent());
        if (orderId == null) {
            log.warn("SePay webhook: không tìm thấy orderId trong '{}'", payload.getContent());
            return ResponseEntity.ok(Map.of("status", "no_order_found"));
        }

        // Xác nhận thanh toán → PENDING → PROCESSING
        try {
            orderService.confirmPayment(orderId);
            log.info("SePay webhook: xác nhận thành công orderId={}", orderId);
            return ResponseEntity.ok(Map.of("status", "success", "orderId", orderId.toString()));
        } catch (Exception e) {
            log.error("SePay webhook: lỗi orderId={} — {}", orderId, e.getMessage());
            // Trả 200 để SePay không retry liên tục
            return ResponseEntity.ok(Map.of("status", "error", "message", e.getMessage()));
        }
    }

    /**
     * Tìm số đứng sau "Bookish" trong nội dung chuyển khoản.
     * Ví dụ: "Bookish 42" → 42
     */
    private Integer parseOrderId(String content) {
        if (content == null || content.isBlank()) return null;
        Matcher matcher = Pattern.compile("(?i)bookish\\s+(\\d+)").matcher(content);
        return matcher.find() ? Integer.parseInt(matcher.group(1)) : null;
    }
}