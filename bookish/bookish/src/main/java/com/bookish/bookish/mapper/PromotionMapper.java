package com.bookish.bookish.mapper;

import com.bookish.bookish.dto.request.PromotionRequest;
import com.bookish.bookish.dto.response.PromotionResponse;
import com.bookish.bookish.entity.Promotion;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.LocalDateTime;

@Component
public class PromotionMapper {

    public Promotion toEntity(PromotionRequest request) {
        return Promotion.builder()
                .code(request.getCode())
                .discountType(request.getDiscountType())
                .discountValue(request.getDiscountValue())
                .status(request.getStatus())
                .usageLimit(request.getUsageLimit())
                .usedCount(0)
                .minOrderValue(request.getMinOrderValue())
                .maxDiscount(request.getMaxDiscount())
                .build();
    }

    public PromotionResponse toResponse(Promotion promotion) {
        LocalDateTime start = promotion.getStartDate();
        LocalDateTime end = promotion.getEndTime();

        Integer durationDays = null;
        Long remainingDays = null;

        if (start != null && end != null) {
            durationDays = (int) Duration.between(start, end).toDays();
            remainingDays = Duration.between(LocalDateTime.now(), end).toDays();
        }

        return PromotionResponse.builder()
                .promotion_id(promotion.getPromotion_id())
                .code(promotion.getCode())
                .discountType(promotion.getDiscountType())
                .discountValue(promotion.getDiscountValue())
                .startDate(start)
                .endTime(end)
                .durationDays(durationDays)
                .remainingDays(remainingDays)
                .status(promotion.getStatus())
                .usageLimit(promotion.getUsageLimit())
                .usedCount(promotion.getUsedCount())
                .minOrderValue(promotion.getMinOrderValue())
                .maxDiscount(promotion.getMaxDiscount())
                .build();
    }

    public void updateEntity(Promotion promotion, PromotionRequest request) {
        promotion.setCode(request.getCode());
        promotion.setDiscountType(request.getDiscountType());
        promotion.setDiscountValue(request.getDiscountValue());
        promotion.setStatus(request.getStatus());
        promotion.setUsageLimit(request.getUsageLimit());
        promotion.setMinOrderValue(request.getMinOrderValue());
        promotion.setMaxDiscount(request.getMaxDiscount());
    }
}