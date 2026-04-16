package com.bookish.bookish.repository;

import com.bookish.bookish.entity.Book;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface BookRepository extends JpaRepository<Book, Integer> {

    // Tìm theo tên sách
    List<Book> findByTitleContainingIgnoreCase(String keyword);

    // Tìm theo tên danh mục
    @Query("SELECT DISTINCT b FROM Book b JOIN b.categories c WHERE LOWER(c.name) LIKE LOWER(CONCAT('%', :categoryName, '%'))")
    List<Book> findByCategoryName(@Param("categoryName") String categoryName);

    // Tìm theo tên tác giả
    @Query("SELECT DISTINCT b FROM Book b JOIN b.authors a WHERE LOWER(a.name) LIKE LOWER(CONCAT('%', :authorName, '%'))")
    List<Book> findByAuthorName(@Param("authorName") String authorName);

    // 5 sách mới nhất (theo createdAt)
    @Query("SELECT b FROM Book b ORDER BY b.createdAt DESC")
    List<Book> findTop5ByOrderByCreatedAtDesc(org.springframework.data.domain.Pageable pageable);

    // 5 sách bán chạy nhất (tổng số lượng đã bán từ order_items, chỉ đơn không bị hủy)
    @Query("""
        SELECT b FROM Book b
        JOIN OrderItem oi ON oi.book = b
        WHERE oi.order.status != 'CANCELLED'
        GROUP BY b
        ORDER BY SUM(oi.quantity) DESC
    """)
    List<Book> findTopSellingBooks(org.springframework.data.domain.Pageable pageable);

    // Dùng cho trang chủ, tìm kiếm — chỉ lấy sách chưa bị xóa
    List<Book> findByDeletedFalse();

    List<Book> findByDeletedFalseAndTitleContainingIgnoreCase(String keyword);

    @Query("SELECT DISTINCT b FROM Book b JOIN b.categories c WHERE b.deleted = false AND LOWER(c.name) LIKE LOWER(CONCAT('%', :categoryName, '%'))")
    List<Book> findActiveByCategoryName(@Param("categoryName") String categoryName);

    @Query("SELECT b FROM Book b WHERE b.deleted = false ORDER BY b.createdAt DESC")
    List<Book> findActiveNewest(org.springframework.data.domain.Pageable pageable);
}