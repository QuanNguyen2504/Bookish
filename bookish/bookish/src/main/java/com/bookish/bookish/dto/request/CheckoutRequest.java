package com.bookish.bookish.dto.request;

import lombok.Getter;
import lombok.Setter;

import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
public class CheckoutRequest {
    private List<Integer> cartItemIds;
    private String shippingAddress;
    private String phone;
    private String paymentMethod; // CASH | QR_CODE

    //  MỚI: hỗ trợ nhiều mã giảm giá trên 1 đơn
    private List<Integer> promotionIds = new ArrayList<>();
}