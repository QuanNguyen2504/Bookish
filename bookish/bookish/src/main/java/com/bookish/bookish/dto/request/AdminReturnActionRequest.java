package com.bookish.bookish.dto.request;

import lombok.Data;

@Data
public class AdminReturnActionRequest {
    // Ghi chú của admin (khi reject / approve / mark refunded)
    private String adminNote;
}
