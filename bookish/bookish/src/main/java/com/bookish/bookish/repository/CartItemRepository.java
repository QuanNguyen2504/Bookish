package com.bookish.bookish.repository;

import com.bookish.bookish.entity.Cart;
import com.bookish.bookish.entity.Book;
import com.bookish.bookish.entity.CartItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface CartItemRepository extends JpaRepository<CartItem, Integer> {

    Optional<CartItem> findByCartAndBook(Cart cart, Book book);

    @Query(value = "SELECT ci.* FROM cart_items ci JOIN cart c ON ci.cart_id = c.cart_id WHERE ci.cart_item_id IN :ids AND c.user_id = :userId", nativeQuery = true)
    List<CartItem> findAllByIdsAndUserId(@Param("ids") List<Integer> ids, @Param("userId") Integer userId);

    // Tìm cart items theo sách và user (đi qua cart)
    @Query("SELECT ci FROM CartItem ci WHERE ci.book = :book AND ci.cart.user = :#{#cart.user}")
    Optional<CartItem> findByBookAndCart(@Param("book") Book book, @Param("cart") Cart cart);

    // Xóa cart items theo sách và userId
    @Modifying
    @Query("DELETE FROM CartItem ci WHERE ci.book = :book AND ci.cart.user.id = :userId")
    void deleteByBookAndUserId(@Param("book") Book book, @Param("userId") Integer userId);

    void deleteByBook(Book book);

    void deleteByCart(Cart cart);
}