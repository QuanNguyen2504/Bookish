package com.bookish.bookish.dto.response;

import com.bookish.bookish.entity.DiscountType;
import lombok.*;

import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PromotionApplyResponse {

    private Integer promotionId;
    private String code;
    private DiscountType discountType;

    // Số tiền giảm được tính ra
    private BigDecimal discountAmount;

    // Phí ship sau khi áp (0 nếu mã FREESHIP)
    private BigDecimal shippingFee;

    // Tổng cuối cùng sau khi áp mã này
    private BigDecimal finalAmount;

    private String message;
}