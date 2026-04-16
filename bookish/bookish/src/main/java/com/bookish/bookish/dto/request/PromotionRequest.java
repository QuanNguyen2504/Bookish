package com.bookish.bookish.dto.request;

import com.bookish.bookish.entity.DiscountType;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PromotionRequest {

    private String code;
    private DiscountType discountType;
    private BigDecimal discountValue;

    private LocalDateTime startDate;
    private Integer durationDays;

    private Boolean status;
    private Integer usageLimit;

    // 🔥 MỚI
    private BigDecimal minOrderValue;
    private BigDecimal maxDiscount;
}