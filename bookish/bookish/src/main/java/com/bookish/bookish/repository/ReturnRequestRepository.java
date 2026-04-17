package com.bookish.bookish.repository;

import com.bookish.bookish.entity.Order;
import com.bookish.bookish.entity.ReturnRequest;
import com.bookish.bookish.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ReturnRequestRepository extends JpaRepository<ReturnRequest, Integer> {

    List<ReturnRequest> findAllByOrderByCreatedAtDesc();

    List<ReturnRequest> findByUserOrderByCreatedAtDesc(User user);

    Optional<ReturnRequest> findByOrder(Order order);

    boolean existsByOrder(Order order);

    long countByStatus(String status);

    @Query("SELECT r FROM ReturnRequest r WHERE (:status IS NULL OR r.status = :status) ORDER BY r.createdAt DESC")
    Page<ReturnRequest> findAllPaged(@Param("status") String status, Pageable pageable);
}