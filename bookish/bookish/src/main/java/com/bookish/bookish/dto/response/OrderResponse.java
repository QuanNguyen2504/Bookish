package com.bookish.bookish.dto.response;

import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OrderResponse {
    private Integer orderId;
    private String status;
    private String shippingAddress;
    private String phone;
    private String paymentMethod;

    //  MỚI
    private BigDecimal subtotal;
    private BigDecimal discountAmount;

    private BigDecimal shippingFee;
    private BigDecimal totalPrice;

    private LocalDateTime createdAt;
    private List<OrderItemResponse> items;

    //  MỚI: các mã đã áp cho đơn này
    private List<AppliedPromotionResponse> promotions;
}