package com.bookish.bookish.repository;

import com.bookish.bookish.entity.Order;
import com.bookish.bookish.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

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
}