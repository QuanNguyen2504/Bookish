package com.bookish.bookish.dto.response;

import lombok.*;
import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ShippingFeeResponse {
    private double distanceKm;        // khoảng cách (km)
    private String distanceText;      // "15.3 km"
    private String durationText;      // "25 phút"
    private BigDecimal shippingFee;   // phí ship (VND)
    private String feeDescription;    // "Nội thành Hà Nội"
    private String originAddress;     // địa chỉ cửa hàng
    private String destinationAddress;// địa chỉ khách
}