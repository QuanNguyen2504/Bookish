package com.bookish.bookish.repository;

import com.bookish.bookish.entity.Order;
import com.bookish.bookish.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;

import java.time.LocalDateTime;
import java.util.List;

public interface OrderRepository extends JpaRepository<Order, Integer> {
    List<Order> findByUserOrderByCreatedAtDesc(User user);
    List<Order> findAllByOrderByCreatedAtDesc();
    List<Order> findByStatusAndPaymentMethodAndCreatedAtBefore(
            String status, String paymentMethod, LocalDateTime before);

    // Cho bulk confirm (CASH PENDING)
    List<Order> findByStatusAndPaymentMethod(String status, String paymentMethod);

    //MỚI: cho bulk ship (tất cả đơn PROCESSING)
    List<Order> findByStatus(String status);

    Page<Order> findByStatusOrderByCreatedAtDesc(String status, Pageable pageable);

    @Query("SELECT o FROM Order o ORDER BY o.createdAt DESC")
    Page<Order> findAllPaged(Pageable pageable);
}