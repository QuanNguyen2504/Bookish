package com.bookish.bookish.service;

import com.bookish.bookish.dto.response.WishlistResponse;
import com.bookish.bookish.entity.Author;
import com.bookish.bookish.entity.Book;
import com.bookish.bookish.entity.Category;
import com.bookish.bookish.entity.User;
import com.bookish.bookish.entity.Wishlist;
import com.bookish.bookish.exception.AppException;
import com.bookish.bookish.exception.ErrorCode;
import com.bookish.bookish.repository.BookRepository;
import com.bookish.bookish.repository.ReviewRepository;
import com.bookish.bookish.repository.UserRepository;
import com.bookish.bookish.repository.WishlistRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class WishlistService {

    private final WishlistRepository wishlistRepository;
    private final UserRepository userRepository;
    private final BookRepository bookRepository;
    private final ReviewRepository reviewRepository;


    @Transactional
    public WishlistResponse addToWishlist(Integer userId, Integer bookId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        Book book = bookRepository.findById(bookId)
                .orElseThrow(() -> new AppException(ErrorCode.BOOK_NOT_FOUND));

        if (wishlistRepository.existsByUserAndBook(user, book)) {
            throw new AppException(ErrorCode.WISHLIST_ITEM_EXISTED);
        }

        Wishlist item = Wishlist.builder()
                .user(user)
                .book(book)
                .build();

        wishlistRepository.save(item);
        return toResponse(item);
    }

    @Transactional
    public void removeFromWishlist(Integer userId, Integer bookId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        Book book = bookRepository.findById(bookId)
                .orElseThrow(() -> new AppException(ErrorCode.BOOK_NOT_FOUND));

        Wishlist item = wishlistRepository.findByUserAndBook(user, book)
                .orElseThrow(() -> new AppException(ErrorCode.WISHLIST_ITEM_NOT_FOUND));

        wishlistRepository.delete(item);
    }


    public List<WishlistResponse> getMyWishlist(Integer userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        return wishlistRepository.findByUserOrderByCreatedAtDesc(user).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    public boolean isInWishlist(Integer userId, Integer bookId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
        Book book = bookRepository.findById(bookId)
                .orElseThrow(() -> new AppException(ErrorCode.BOOK_NOT_FOUND));
        return wishlistRepository.existsByUserAndBook(user, book);
    }

    // Đếm tổng số sách trong wishlist của user (cho badge)
    public long countMyWishlist(Integer userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
        return wishlistRepository.countByUser(user);
    }


    private WishlistResponse toResponse(Wishlist w) {
        Book b = w.getBook();

        Set<String> authorNames = b.getAuthors() == null ? Set.of() :
                b.getAuthors().stream().map(Author::getName).collect(Collectors.toSet());

        Set<String> categoryNames = b.getCategories() == null ? Set.of() :
                b.getCategories().stream().map(Category::getName).collect(Collectors.toSet());

        Double avg = reviewRepository.findAvgRatingByBook(b);

        return WishlistResponse.builder()
                .wishlistId(w.getId())
                .addedAt(w.getCreatedAt())
                .bookId(b.getBook_id())
                .title(b.getTitle())
                .price(b.getPrice())
                .salePercent(b.getSalePercent())
                .image(b.getImage())
                .stock(b.getStock())
                .authors(authorNames)
                .categories(categoryNames)
                .avgRating(avg != null ? Math.round(avg * 10.0) / 10.0 : 0.0)
                .build();
    }
}
