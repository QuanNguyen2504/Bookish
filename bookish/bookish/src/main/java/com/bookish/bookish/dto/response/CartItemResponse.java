package com.bookish.bookish.dto.response;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
@Builder
public class CartItemResponse {
    private Integer cartItemId;
    private Integer bookId;
    private String title;
    private String image;
    private BigDecimal originalPrice;
    private Integer salePercent;
    private BigDecimal finalPrice;
    private Integer quantity;
    private BigDecimal subtotal;
    private Integer stock;       // số lượng tồn kho
    private boolean deleted;     // true nếu sách đã bị xóa
}