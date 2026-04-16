package com.bookish.bookish.dto.response;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.util.List;

@Getter
@Setter
@Builder
public class CartResponse {
    private Integer cartId;
    private List<CartItemResponse> items;
    private int totalItems;
    private BigDecimal totalPrice;
}