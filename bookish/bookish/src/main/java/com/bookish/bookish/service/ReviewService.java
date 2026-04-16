package com.bookish.bookish.service;

import com.bookish.bookish.dto.request.ReviewRequest;
import com.bookish.bookish.dto.response.ReviewResponse;
import com.bookish.bookish.entity.Book;
import com.bookish.bookish.entity.Review;
import com.bookish.bookish.entity.User;
import com.bookish.bookish.repository.BookRepository;
import com.bookish.bookish.repository.ReviewRepository;
import com.bookish.bookish.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ReviewService {

    private final ReviewRepository reviewRepository;
    private final UserRepository userRepository;
    private final BookRepository bookRepository;

    // Lấy tất cả review của một cuốn sách
    @Transactional(readOnly = true)
    public List<ReviewResponse> getReviewsByBook(Integer bookId) {
        Book book = bookRepository.findById(bookId)
                .orElseThrow(() -> new RuntimeException("Sách không tồn tại"));
        return reviewRepository.findByBookOrderByCreatedAtDesc(book)
                .stream().map(this::toResponse).toList();
    }

    // Kiểm tra user đã review sách này chưa
    @Transactional(readOnly = true)
    public boolean hasReviewed(Integer userId, Integer bookId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User không tồn tại"));
        Book book = bookRepository.findById(bookId)
                .orElseThrow(() -> new RuntimeException("Sách không tồn tại"));
        return reviewRepository.existsByUserAndBook(user, book);
    }

    // Kiểm tra user có thể review (đã mua + DELIVERED)
    @Transactional(readOnly = true)
    public boolean canReview(Integer userId, Integer bookId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User không tồn tại"));
        Book book = bookRepository.findById(bookId)
                .orElseThrow(() -> new RuntimeException("Sách không tồn tại"));
        return reviewRepository.hasPurchasedAndDelivered(user, book);
    }

    // Tạo review mới
    @Transactional
    public ReviewResponse createReview(Integer userId, ReviewRequest req) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User không tồn tại"));
        Book book = bookRepository.findById(req.getBookId())
                .orElseThrow(() -> new RuntimeException("Sách không tồn tại"));

        // Kiểm tra đã mua và nhận hàng chưa
        if (!reviewRepository.hasPurchasedAndDelivered(user, book)) {
            throw new RuntimeException("Bạn cần mua và nhận hàng trước khi đánh giá");
        }

        // Kiểm tra đã review chưa
        if (reviewRepository.existsByUserAndBook(user, book)) {
            throw new RuntimeException("Bạn đã đánh giá cuốn sách này rồi");
        }

        Review review = Review.builder()
                .user(user)
                .book(book)
                .rating(req.getRating())
                .comment(req.getComment())
                .createdAt(LocalDateTime.now())
                .build();

        return toResponse(reviewRepository.save(review));
    }

    // Lấy rating trung bình của sách
    @Transactional(readOnly = true)
    public double getAvgRating(Integer bookId) {
        Book book = bookRepository.findById(bookId)
                .orElseThrow(() -> new RuntimeException("Sách không tồn tại"));
        Double avg = reviewRepository.findAvgRatingByBook(book);
        return avg != null ? Math.round(avg * 10.0) / 10.0 : 0;
    }

    private ReviewResponse toResponse(Review r) {
        return ReviewResponse.builder()
                .reviewId(r.getReviewId())
                .userId(r.getUser().getId())
                .username(r.getUser().getUsername())
                .avatarUrl(r.getUser().getAvatarUrl())
                .bookId(r.getBook().getBook_id())
                .rating(r.getRating())
                .comment(r.getComment())
                .createdAt(r.getCreatedAt())
                .build();
    }
}