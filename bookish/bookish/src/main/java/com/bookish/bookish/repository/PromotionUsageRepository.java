package com.bookish.bookish.repository;

import com.bookish.bookish.entity.PromotionUsage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface PromotionUsageRepository extends JpaRepository<PromotionUsage, Integer> {

    @Query("SELECT COUNT(pu) > 0 FROM PromotionUsage pu " +
            "WHERE pu.promotion.promotion_id = :promotionId AND pu.userId = :userId")
    boolean existsByPromotionAndUser(@Param("promotionId") Integer promotionId,
                                     @Param("userId") Integer userId);

    @Query("SELECT pu FROM PromotionUsage pu " +
            "WHERE pu.promotion.promotion_id = :promotionId AND pu.userId = :userId")
    Optional<PromotionUsage> findByPromotionAndUser(@Param("promotionId") Integer promotionId,
                                                    @Param("userId") Integer userId);
}