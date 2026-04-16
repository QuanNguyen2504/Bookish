package com.bookish.bookish.service;

import com.bookish.bookish.dto.request.AddToCartRequest;
import com.bookish.bookish.dto.request.UpdateCartItemRequest;
import com.bookish.bookish.dto.response.CartItemResponse;
import com.bookish.bookish.dto.response.CartResponse;
import com.bookish.bookish.entity.Book;
import com.bookish.bookish.entity.Cart;
import com.bookish.bookish.entity.CartItem;
import com.bookish.bookish.entity.User;
import com.bookish.bookish.repository.BookRepository;
import com.bookish.bookish.repository.CartItemRepository;
import com.bookish.bookish.repository.CartRepository;
import com.bookish.bookish.repository.UserRepository;
import com.bookish.bookish.exception.AppException;
import com.bookish.bookish.exception.ErrorCode;
import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class CartService {

    private final CartRepository cartRepository;
    private final CartItemRepository cartItemRepository;
    private final BookRepository bookRepository;
    private final UserRepository userRepository;
    private final EntityManager entityManager;

    private Cart getOrCreateCart(Integer userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
        return cartRepository.findByUser(user).orElseGet(() -> {
            Cart cart = Cart.builder()
                    .user(user)
                    .createdAt(LocalDateTime.now())
                    .items(new ArrayList<>())
                    .build();
            return cartRepository.save(cart);
        });
    }

    private CartItemResponse toItemResponse(CartItem item) {
        Book book = bookRepository.findById(item.getBook().getBook_id()).orElse(null);

        // Sách bị xóa thật (null) HOẶC soft delete (deleted = true)
        if (book == null || Boolean.TRUE.equals(book.getDeleted())) {
            return CartItemResponse.builder()
                    .cartItemId(item.getCart_item_id())
                    .bookId(book != null ? book.getBook_id() : null)
                    .title(book != null ? book.getTitle() : "Sản phẩm không còn tồn tại")
                    .image(book != null ? book.getImage() : null)
                    .originalPrice(BigDecimal.ZERO)
                    .salePercent(0)
                    .finalPrice(BigDecimal.ZERO)
                    .quantity(item.getQuantity())
                    .subtotal(BigDecimal.ZERO)
                    .stock(0)
                    .deleted(true)
                    .build();
        }

        int sale = book.getSalePercent() == null ? 0 : book.getSalePercent();
        BigDecimal finalPrice = book.getPrice()
                .multiply(BigDecimal.ONE.subtract(
                        BigDecimal.valueOf(sale).divide(BigDecimal.valueOf(100))));
        return CartItemResponse.builder()
                .cartItemId(item.getCart_item_id())
                .bookId(book.getBook_id())
                .title(book.getTitle())
                .image(book.getImage())
                .originalPrice(book.getPrice())
                .salePercent(sale)
                .finalPrice(finalPrice)
                .quantity(item.getQuantity())
                .subtotal(finalPrice.multiply(BigDecimal.valueOf(item.getQuantity())))
                .stock(book.getStock())
                .deleted(false)
                .build();
    }

    private CartResponse toCartResponse(Cart cart) {
        List<CartItemResponse> items = cart.getItems().stream()
                .map(this::toItemResponse)
                .toList();
        BigDecimal total = items.stream()
                .filter(i -> !i.isDeleted() && i.getStock() > 0)
                .map(CartItemResponse::getSubtotal)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        return CartResponse.builder()
                .cartId(cart.getCart_id())
                .items(items)
                .totalItems(items.size())
                .totalPrice(total)
                .build();
    }

    @Transactional
    public CartResponse getCart(Integer userId) {
        return toCartResponse(getOrCreateCart(userId));
    }

    @Transactional
    public CartResponse addToCart(Integer userId, AddToCartRequest req) {
        Cart cart = getOrCreateCart(userId);
        Book book = bookRepository.findById(req.getBookId())
                .orElseThrow(() -> new AppException(ErrorCode.BOOK_NOT_FOUND));

        // Không cho thêm sách đã bị xóa vào giỏ
        if (Boolean.TRUE.equals(book.getDeleted())) {
            throw new AppException(ErrorCode.BOOK_DELETED);
        }

        if (book.getStock() < req.getQuantity())
            throw new AppException(ErrorCode.BOOK_OUT_OF_STOCK);

        CartItem item = cartItemRepository.findByCartAndBook(cart, book)
                .orElseGet(() -> CartItem.builder()
                        .cart(cart)
                        .book(book)
                        .quantity(0)
                        .build());

        item.setQuantity(item.getQuantity() + req.getQuantity());
        cartItemRepository.save(item);
        entityManager.flush();
        entityManager.refresh(cart);

        return toCartResponse(cart);
    }

    @Transactional
    public CartResponse updateQuantity(Integer userId, Integer cartItemId,
                                       UpdateCartItemRequest req) {
        CartItem item = cartItemRepository.findById(cartItemId)
                .orElseThrow(() -> new AppException(ErrorCode.CART_ITEM_NOT_FOUND));
        Cart cart = item.getCart();

        if (req.getQuantity() <= 0) {
            cart.getItems().remove(item);
            cartItemRepository.delete(item);
        } else {
            // Không cho cập nhật sách đã bị xóa
            if (Boolean.TRUE.equals(item.getBook().getDeleted())) {
                throw new AppException(ErrorCode.BOOK_DELETED);
            }
            if (item.getBook().getStock() < req.getQuantity())
                throw new AppException(ErrorCode.BOOK_OUT_OF_STOCK);
            item.setQuantity(req.getQuantity());
            cartItemRepository.save(item);
        }

        entityManager.flush();
        entityManager.refresh(cart);
        return toCartResponse(cart);
    }

    @Transactional
    public CartResponse removeItem(Integer userId, Integer cartItemId) {
        CartItem item = cartItemRepository.findById(cartItemId)
                .orElseThrow(() -> new AppException(ErrorCode.CART_ITEM_NOT_FOUND));
        Cart cart = item.getCart();

        cart.getItems().remove(item);
        cartItemRepository.delete(item);
        entityManager.flush();
        entityManager.refresh(cart);

        return toCartResponse(cart);
    }

    @Transactional
    public CartResponse clearCart(Integer userId) {
        Cart cart = getOrCreateCart(userId);
        cartItemRepository.deleteAll(cart.getItems());
        cart.getItems().clear();
        entityManager.flush();
        entityManager.refresh(cart);
        return toCartResponse(cart);
    }
}