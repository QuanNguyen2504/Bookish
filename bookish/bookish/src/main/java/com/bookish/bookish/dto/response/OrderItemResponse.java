package com.bookish.bookish.dto.response;

import lombok.*;

import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OrderItemResponse {
    private Integer orderItemId;
    private Integer bookId;
    private String title;
    private String image;
    private Integer quantity;
    private BigDecimal price;
    private BigDecimal subtotal;
}