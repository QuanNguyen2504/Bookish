package com.bookish.bookish.repository;

import com.bookish.bookish.entity.Book;
import com.bookish.bookish.entity.Order;
import com.bookish.bookish.entity.OrderItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface OrderItemRepository extends JpaRepository<OrderItem, Integer> {
    List<OrderItem> findByOrder(Order order);
    // Đếm số order_items của sách này trong đơn hàng chưa hoàn thành
    @Query("""
    SELECT COUNT(oi) FROM OrderItem oi
    WHERE oi.book = :book
    AND oi.order.status IN ('PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPING')
""")
    long countActiveOrdersByBook(@Param("book") Book book);
}