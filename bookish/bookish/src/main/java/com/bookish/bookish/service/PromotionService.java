package com.bookish.bookish.service;

import com.bookish.bookish.dto.request.PromotionRequest;
import com.bookish.bookish.dto.request.PromotionValidateRequest;
import com.bookish.bookish.dto.response.PromotionApplyResponse;
import com.bookish.bookish.dto.response.PromotionResponse;
import com.bookish.bookish.entity.DiscountType;
import com.bookish.bookish.entity.Promotion;
import com.bookish.bookish.entity.PromotionUsage;
import com.bookish.bookish.exception.AppException;
import com.bookish.bookish.exception.ErrorCode;
import com.bookish.bookish.mapper.PromotionMapper;
import com.bookish.bookish.repository.PromotionRepository;
import com.bookish.bookish.repository.PromotionUsageRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class PromotionService {

    private final PromotionRepository repository;
    private final PromotionUsageRepository usageRepository;
    private final PromotionMapper mapper;

    // ==================== CRUD ====================

    public PromotionResponse create(PromotionRequest request) {
        repository.findByCode(request.getCode())
                .ifPresent(p -> { throw new AppException(ErrorCode.PROMOTION_CODE_EXISTED); });

        if (request.getDurationDays() == null || request.getDurationDays() <= 0) {
            throw new AppException(ErrorCode.INVALID_PROMOTION_TIME);
        }

        Promotion promotion = mapper.toEntity(request);
        LocalDateTime start = request.getStartDate() != null
                ? request.getStartDate()
                : LocalDateTime.now();
        promotion.setStartDate(start);
        promotion.setEndTime(start.plusDays(request.getDurationDays()));

        return mapper.toResponse(repository.save(promotion));
    }

    public PromotionResponse update(Integer id, PromotionRequest request) {
        Promotion promotion = repository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.PROMOTION_NOT_FOUND));

        repository.findByCode(request.getCode())
                .ifPresent(existing -> {
                    if (!existing.getPromotion_id().equals(id)) {
                        throw new AppException(ErrorCode.PROMOTION_CODE_EXISTED);
                    }
                });

        if (request.getDurationDays() == null || request.getDurationDays() <= 0) {
            throw new AppException(ErrorCode.INVALID_PROMOTION_TIME);
        }

        mapper.updateEntity(promotion, request);

        LocalDateTime start = request.getStartDate() != null
                ? request.getStartDate()
                : promotion.getStartDate();
        promotion.setStartDate(start);
        promotion.setEndTime(start.plusDays(request.getDurationDays()));

        return mapper.toResponse(repository.save(promotion));
    }

    public void delete(Integer id) {
        if (!repository.existsById(id)) {
            throw new AppException(ErrorCode.PROMOTION_NOT_FOUND);
        }
        repository.deleteById(id);
    }

    public PromotionResponse getById(Integer id) {
        return mapper.toResponse(repository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.PROMOTION_NOT_FOUND)));
    }

    public List<PromotionResponse> getAll() {
        LocalDateTime now = LocalDateTime.now();
        return repository.findAll().stream()
                .filter(p -> p.getEndTime().isAfter(now))
                .map(mapper::toResponse)
                .toList();
    }

    // ==================== VALIDATE & APPLY ====================

    public PromotionApplyResponse validate(Integer userId, PromotionValidateRequest request) {
        Promotion promotion = repository.findByCode(request.getCode())
                .orElseThrow(() -> new AppException(ErrorCode.PROMOTION_NOT_FOUND));

        // Check xung đột: không được có 2 mã cùng discountType
        if (request.getAppliedCodes() != null) {
            for (String appliedCode : request.getAppliedCodes()) {
                if (appliedCode.equalsIgnoreCase(promotion.getCode())) continue;
                Promotion applied = repository.findByCode(appliedCode).orElse(null);
                if (applied != null && applied.getDiscountType() == promotion.getDiscountType()) {
                    throw new AppException(ErrorCode.PROMOTION_TYPE_CONFLICT);
                }
            }
        }

        checkAvailable(promotion, userId, request.getTotalAmount());

        BigDecimal shippingFee = request.getShippingFee() != null
                ? request.getShippingFee()
                : BigDecimal.ZERO;
        BigDecimal discount = calculateDiscount(promotion, request.getTotalAmount(), shippingFee);

        BigDecimal finalShipping = promotion.getDiscountType() == DiscountType.FREESHIP
                ? BigDecimal.ZERO
                : shippingFee;
        BigDecimal finalAmount = promotion.getDiscountType() == DiscountType.FREESHIP
                ? request.getTotalAmount().add(finalShipping)
                : request.getTotalAmount().subtract(discount).add(finalShipping);

        return PromotionApplyResponse.builder()
                .promotionId(promotion.getPromotion_id())
                .code(promotion.getCode())
                .discountType(promotion.getDiscountType())
                .discountAmount(discount)
                .shippingFee(finalShipping)
                .finalAmount(finalAmount.max(BigDecimal.ZERO))
                .message("Áp dụng mã thành công")
                .build();
    }

    @Transactional
    public BigDecimal applyOnOrder(Integer promotionId,
                                   Integer userId,
                                   Integer orderId,
                                   BigDecimal totalAmount,
                                   BigDecimal shippingFee) {
        Promotion promotion = repository.findById(promotionId)
                .orElseThrow(() -> new AppException(ErrorCode.PROMOTION_NOT_FOUND));

        checkAvailable(promotion, userId, totalAmount);

        BigDecimal discount = calculateDiscount(promotion, totalAmount, shippingFee);

        promotion.setUsedCount(promotion.getUsedCount() + 1);
        repository.save(promotion);

        usageRepository.save(PromotionUsage.builder()
                .promotion(promotion)
                .userId(userId)
                .orderId(orderId)
                .usedAt(LocalDateTime.now())
                .build());

        return discount;
    }

    @Transactional
    public void refundOnCancel(Promotion promotion, Integer userId) {
        if (promotion == null) return;

        int newUsed = Math.max(0, promotion.getUsedCount() - 1);
        promotion.setUsedCount(newUsed);
        repository.save(promotion);

        usageRepository
                .findByPromotionAndUser(promotion.getPromotion_id(), userId)
                .ifPresent(usageRepository::delete);
    }

    // ==================== HELPERS ====================

    private void checkAvailable(Promotion promotion, Integer userId, BigDecimal totalAmount) {
        LocalDateTime now = LocalDateTime.now();

        if (Boolean.FALSE.equals(promotion.getStatus())) {
            throw new AppException(ErrorCode.PROMOTION_INACTIVE);
        }

        if (promotion.getStartDate() != null && now.isBefore(promotion.getStartDate())) {
            throw new AppException(ErrorCode.PROMOTION_NOT_STARTED);
        }

        if (promotion.getEndTime() != null && now.isAfter(promotion.getEndTime())) {
            throw new AppException(ErrorCode.PROMOTION_EXPIRED);
        }

        if (promotion.getUsageLimit() != null
                && promotion.getUsedCount() >= promotion.getUsageLimit()) {
            throw new AppException(ErrorCode.PROMOTION_OUT_OF_USAGE);
        }

        BigDecimal minOrder = promotion.getMinOrderValue() != null
                ? promotion.getMinOrderValue()
                : BigDecimal.ZERO;
        if (totalAmount == null || totalAmount.compareTo(minOrder) < 0) {
            throw new AppException(ErrorCode.PROMOTION_MIN_ORDER_NOT_MET);
        }

        if (userId != null && usageRepository
                .existsByPromotionAndUser(promotion.getPromotion_id(), userId)) {
            throw new AppException(ErrorCode.PROMOTION_ALREADY_USED);
        }
    }

    public BigDecimal calculateDiscount(Promotion promotion,
                                        BigDecimal totalAmount,
                                        BigDecimal shippingFee) {
        BigDecimal value = promotion.getDiscountValue();
        DiscountType type = promotion.getDiscountType();
        BigDecimal discount;

        switch (type) {
            case PERCENT:
                discount = totalAmount.multiply(value)
                        .divide(BigDecimal.valueOf(100), 0, RoundingMode.HALF_UP);
                if (promotion.getMaxDiscount() != null
                        && discount.compareTo(promotion.getMaxDiscount()) > 0) {
                    discount = promotion.getMaxDiscount();
                }
                break;
            case FIXED:
                discount = value.min(totalAmount);
                break;
            case FREESHIP:
                discount = shippingFee != null ? shippingFee : BigDecimal.ZERO;
                break;
            default:
                discount = BigDecimal.ZERO;
        }
        return discount;
    }
}