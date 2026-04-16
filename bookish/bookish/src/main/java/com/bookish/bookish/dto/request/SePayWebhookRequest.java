package com.bookish.bookish.dto.request;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
public class SePayWebhookRequest {

    private Long id;
    private String gateway;
    private String transactionDate;
    private String accountNumber;
    private String subAccount;
    private String code;
    private String content;          // Nội dung CK — chứa "Bookish {orderId}"
    private String transferType;     // "in" = tiền vào, "out" = tiền ra
    private String description;
    private BigDecimal transferAmount;
    private String referenceCode;
    private BigDecimal accumulated;
}
