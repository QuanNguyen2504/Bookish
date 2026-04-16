package com.bookish.bookish.repository;

import com.bookish.bookish.entity.Review;
import com.bookish.bookish.entity.Book;
import com.bookish.bookish.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ReviewRepository extends JpaRepository<Review, Integer> {

    List<Review> findByBookOrderByCreatedAtDesc(Book book);

    Optional<Review> findByUserAndBook(User user, Book book);

    boolean existsByUserAndBook(User user, Book book);

    @Query("SELECT AVG(r.rating) FROM Review r WHERE r.book = :book")
    Double findAvgRatingByBook(@Param("book") Book book);

    @Query("""
        SELECT COUNT(oi) > 0 FROM OrderItem oi
        WHERE oi.book = :book
        AND oi.order.user = :user
        AND oi.order.status = 'DELIVERED'
    """)
    boolean hasPurchasedAndDelivered(@Param("user") User user, @Param("book") Book book);
}