package com.bookish.bookish.dto.response;

import com.bookish.bookish.entity.ReturnReason;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
public class ReturnRequestResponse {
    private Integer returnId;
    private Integer orderId;
    private Integer userId;
    private String username;
    private String userEmail;

    private ReturnReason reason;
    private String description;
    private String imageUrl;

    private String status;
    private String adminNote;

    private String bankAccount;
    private String bankName;
    private String accountHolder;
    private BigDecimal refundAmount;

    // Thông tin tóm tắt đơn hàng
    private BigDecimal orderTotal;
    private String orderPaymentMethod;
    private LocalDateTime orderDeliveredAt;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}