package com.bookish.bookish.repository;

import com.bookish.bookish.entity.Book;
import com.bookish.bookish.entity.Order;
import com.bookish.bookish.entity.OrderItem;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface OrderItemRepository extends JpaRepository<OrderItem, Integer> {

    List<OrderItem> findByOrder(Order order);

    @Query("""
        SELECT COUNT(oi) FROM OrderItem oi
        WHERE oi.book = :book
        AND oi.order.status IN ('PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPING')
    """)
    long countActiveOrdersByBook(@Param("book") Book book);


    /**
     * Trả về: [bookId, title, image, authorName, soldCount, revenue]
     * Sắp xếp theo doanh thu giảm dần
     */
    @Query("""
        SELECT oi.book.book_id,
               oi.book.title,
               oi.book.image,
               SUM(oi.quantity),
               SUM(oi.price * oi.quantity)
        FROM OrderItem oi
        WHERE oi.order.status != 'CANCELLED'
        GROUP BY oi.book.book_id, oi.book.title, oi.book.image
        ORDER BY SUM(oi.price * oi.quantity) DESC
    """)
    List<Object[]> getTopBooksByRevenue(Pageable pageable);
}
