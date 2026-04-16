package com.bookish.bookish.dto.request;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class AddToCartRequest {
    private Integer bookId;
    private Integer quantity;
}