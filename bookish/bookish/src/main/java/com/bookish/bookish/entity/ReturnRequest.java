package com.bookish.bookish.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "return_requests")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReturnRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "return_id")
    private Integer returnId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "order_id", nullable = false)
    private Order order;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    // Lý do: BROKEN, WRONG_BOOK, NOT_AS_DESCRIBED, CHANGE_MIND, OTHER
    @Enumerated(EnumType.STRING)
    @Column(name = "reason", nullable = false)
    private ReturnReason reason;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    // URL ảnh minh chứng, có thể null
    @Column(name = "image_url")
    private String imageUrl;

    // REQUESTED -> APPROVED/REJECTED -> RETURNED -> REFUNDED
    @Column(name = "status", nullable = false)
    private String status;

    // Ghi chú của admin khi duyệt/từ chối
    @Column(name = "admin_note", columnDefinition = "TEXT")
    private String adminNote;

    // STK ngân hàng user cung cấp để nhận tiền hoàn
    @Column(name = "bank_account")
    private String bankAccount;

    @Column(name = "bank_name")
    private String bankName;

    @Column(name = "account_holder")
    private String accountHolder;

    // Số tiền thực tế hoàn (có thể trừ phí ship nếu đổi ý)
    @Column(name = "refund_amount")
    private java.math.BigDecimal refundAmount;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        if (status == null) status = "REQUESTED";
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}