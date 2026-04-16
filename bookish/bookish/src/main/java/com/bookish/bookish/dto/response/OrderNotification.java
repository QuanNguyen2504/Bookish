package com.bookish.bookish.dto.response;

import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OrderNotification {
    private Integer orderId;
    private String customerName;
    private String customerPhone;
    private BigDecimal totalPrice;
    private String paymentMethod;
    private String shippingAddress;
    private Integer itemCount;
    private LocalDateTime createdAt;
    private String type; // "NEW_ORDER", "ORDER_CANCELLED", "PAYMENT_CONFIRMED"
    private String message;
}