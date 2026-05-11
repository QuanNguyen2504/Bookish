package com.bookish.bookish.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "orders")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Order {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "order_id")
    private Integer orderId;

    @ManyToOne
    @JoinColumn(name = "user_id")
    private User user;

    // 🔥 MỚI: tổng tiền hàng trước khi giảm
    @Column(name = "subtotal")
    private BigDecimal subtotal;

    // 🔥 MỚI: tổng số tiền đã giảm (cộng dồn của tất cả mã)
    @Column(name = "discount_amount")
    private BigDecimal discountAmount;

    // Tổng cuối cùng = subtotal - discountAmount + shippingFee
    @Column(name = "total_price")
    private BigDecimal totalPrice;

    private String status;

    @Column(name = "shipping_address", columnDefinition = "TEXT")
    private String shippingAddress;

    @Column(name = "phone")
    private String phone;

    @Column(name = "payment_method")
    private String paymentMethod;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "shipping_fee")
    private BigDecimal shippingFee;

    @Column(name = "delivered_at")
    private LocalDateTime deliveredAt;

    //  MỚI: danh sách các mã khuyến mãi đã áp cho đơn này
    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<OrderPromotion> orderPromotions = new ArrayList<>();
}