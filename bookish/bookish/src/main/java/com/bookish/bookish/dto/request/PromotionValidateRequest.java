package com.bookish.bookish.dto.request;

import lombok.*;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PromotionValidateRequest {

    private String code;

    // Tổng tiền hàng (chưa cộng ship)
    private BigDecimal totalAmount;

    // Phí ship hiện tại (để tính mã FREESHIP)
    private BigDecimal shippingFee;

    // Danh sách các mã đã áp trước đó (để chặn 2 mã cùng loại)
    @Builder.Default
    private List<String> appliedCodes = new ArrayList<>();
}