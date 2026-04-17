package com.bookish.bookish.repository;

import com.bookish.bookish.entity.Promotion;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface PromotionRepository extends JpaRepository<Promotion, Integer> {

    Optional<Promotion> findByCode(String code);

    @Query("SELECT p FROM Promotion p WHERE (:keyword IS NULL OR LOWER(p.code) LIKE LOWER(CONCAT('%', :keyword, '%')))")
    Page<Promotion> findAllPaged(@Param("keyword") String keyword, Pageable pageable);
}