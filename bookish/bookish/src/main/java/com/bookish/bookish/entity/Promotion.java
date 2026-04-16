package com.bookish.bookish.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "promotions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Promotion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer promotion_id;

    private String code;

    @Enumerated(EnumType.STRING)
    private DiscountType discountType;

    private BigDecimal discountValue;

    private LocalDateTime startDate;

    private LocalDateTime endTime;

    private Boolean status;

    private Integer usageLimit;

    private Integer usedCount;

    //  MỚI
    @Column(name = "min_order_value")
    private BigDecimal minOrderValue;

    @Column(name = "max_discount")
    private BigDecimal maxDiscount;
}