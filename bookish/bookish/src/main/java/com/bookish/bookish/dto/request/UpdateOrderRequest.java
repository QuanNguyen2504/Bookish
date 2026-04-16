package com.bookish.bookish.dto.request;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class UpdateOrderRequest {
    private String shippingAddress;
    private String phone;
}