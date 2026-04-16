package com.bookish.bookish.repository;

import com.bookish.bookish.entity.Book;
import com.bookish.bookish.entity.User;
import com.bookish.bookish.entity.Wishlist;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface WishlistRepository extends JpaRepository<Wishlist, Integer> {

    // Lấy toàn bộ wishlist của 1 user — sắp xếp mới nhất trước
    List<Wishlist> findByUserOrderByCreatedAtDesc(User user);

    // Kiểm tra user đã thích sách này chưa
    boolean existsByUserAndBook(User user, Book book);

    // Dùng khi xoá
    Optional<Wishlist> findByUserAndBook(User user, Book book);

    // Đếm số lượng sách trong wishlist của user
    long countByUser(User user);

    // (Tuỳ chọn) Đếm số user đã yêu thích 1 sách — dùng cho thống kê "sách được yêu thích nhất"
    long countByBook(Book book);
}
