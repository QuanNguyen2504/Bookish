package com.bookish.bookish.dto.response;

import com.bookish.bookish.entity.DiscountType;
import lombok.*;

import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AppliedPromotionResponse {
    private Integer promotionId;
    private String code;
    private DiscountType discountType;
    private BigDecimal discountAmount;
}