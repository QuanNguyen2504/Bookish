package com.bookish.bookish.repository;

import com.bookish.bookish.entity.Book;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface BookRepository extends JpaRepository<Book, Integer> {


    List<Book> findByTitleContainingIgnoreCase(String keyword);

    @Query("SELECT DISTINCT b FROM Book b JOIN b.categories c WHERE LOWER(c.name) LIKE LOWER(CONCAT('%', :categoryName, '%'))")
    List<Book> findByCategoryName(@Param("categoryName") String categoryName);

    @Query("SELECT DISTINCT b FROM Book b JOIN b.authors a WHERE LOWER(a.name) LIKE LOWER(CONCAT('%', :authorName, '%'))")
    List<Book> findByAuthorName(@Param("authorName") String authorName);

    @Query("SELECT b FROM Book b ORDER BY b.createdAt DESC")
    List<Book> findTop5ByOrderByCreatedAtDesc(Pageable pageable);

    @Query("""
        SELECT b FROM Book b
        JOIN OrderItem oi ON oi.book = b
        WHERE oi.order.status != 'CANCELLED'
        GROUP BY b
        ORDER BY SUM(oi.quantity) DESC
    """)
    List<Book> findTopSellingBooks(Pageable pageable);

    List<Book> findByDeletedFalse();

    List<Book> findByDeletedFalseAndTitleContainingIgnoreCase(String keyword);

    @Query("SELECT DISTINCT b FROM Book b JOIN b.categories c WHERE b.deleted = false AND LOWER(c.name) LIKE LOWER(CONCAT('%', :categoryName, '%'))")
    List<Book> findActiveByCategoryName(@Param("categoryName") String categoryName);

    @Query("SELECT b FROM Book b WHERE b.deleted = false ORDER BY b.createdAt DESC")
    List<Book> findActiveNewest(Pageable pageable);

    // ===================== PHÂN TRANG MỚI =====================

    /** Admin: phân trang tất cả sách (kể cả deleted), tìm kiếm theo tên */
    @Query("SELECT b FROM Book b WHERE (:keyword IS NULL OR LOWER(b.title) LIKE LOWER(CONCAT('%', :keyword, '%')))")
    Page<Book> findAllPaged(@Param("keyword") String keyword, Pageable pageable);

    /** Admin: phân trang + lọc theo danh mục */
    @Query("""
        SELECT DISTINCT b FROM Book b
        JOIN b.categories c
        WHERE (:keyword IS NULL OR LOWER(b.title) LIKE LOWER(CONCAT('%', :keyword, '%')))
          AND (:categoryId IS NULL OR c.id = :categoryId)
    """)
    Page<Book> findAllPagedWithCategory(
            @Param("keyword") String keyword,
            @Param("categoryId") Integer categoryId,
            Pageable pageable
    );

    /** User: phân trang sách chưa xóa, tìm kiếm + lọc danh mục */
    @Query("""
        SELECT DISTINCT b FROM Book b
        LEFT JOIN b.categories c
        WHERE b.deleted = false
          AND (:keyword IS NULL OR LOWER(b.title) LIKE LOWER(CONCAT('%', :keyword, '%')))
          AND (:categoryId IS NULL OR c.id = :categoryId)
    """)
    Page<Book> findActivePagedWithCategory(
            @Param("keyword") String keyword,
            @Param("categoryId") Integer categoryId,
            Pageable pageable
    );
}