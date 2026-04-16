package com.bookish.bookish.dto.response;

import com.bookish.bookish.entity.DiscountType;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PromotionResponse {

    private Integer promotion_id;
    private String code;
    private DiscountType discountType;
    private BigDecimal discountValue;

    private LocalDateTime startDate;
    private LocalDateTime endTime;

    private Integer durationDays;
    private Long remainingDays;

    private Boolean status;
    private Integer usageLimit;
    private Integer usedCount;

    //  MỚI
    private BigDecimal minOrderValue;
    private BigDecimal maxDiscount;
}