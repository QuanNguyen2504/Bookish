package com.bookish.bookish.controller;

import com.bookish.bookish.dto.request.ReviewRequest;
import com.bookish.bookish.dto.response.ReviewResponse;
import com.bookish.bookish.security.JwtUtil;
import com.bookish.bookish.service.ReviewService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/reviews")
@RequiredArgsConstructor
public class ReviewController {

    private final ReviewService reviewService;
    private final JwtUtil jwtUtil;

    // GET /api/reviews/book/{bookId} — lấy review của sách (public)
    @GetMapping("/book/{bookId}")
    public ResponseEntity<List<ReviewResponse>> getByBook(@PathVariable Integer bookId) {
        return ResponseEntity.ok(reviewService.getReviewsByBook(bookId));
    }

    // GET /api/reviews/book/{bookId}/avg — rating trung bình (public)
    @GetMapping("/book/{bookId}/avg")
    public ResponseEntity<Map<String, Object>> getAvgRating(@PathVariable Integer bookId) {
        return ResponseEntity.ok(Map.of("avgRating", reviewService.getAvgRating(bookId)));
    }

    // GET /api/reviews/can-review/{bookId} — kiểm tra user có thể review không
    @GetMapping("/can-review/{bookId}")
    public ResponseEntity<Map<String, Object>> canReview(
            @PathVariable Integer bookId,
            @RequestHeader("Authorization") String authHeader) {
        Integer userId = getUserId(authHeader);
        boolean canReview = reviewService.canReview(userId, bookId);
        boolean hasReviewed = reviewService.hasReviewed(userId, bookId);
        return ResponseEntity.ok(Map.of("canReview", canReview, "hasReviewed", hasReviewed));
    }

    // POST /api/reviews — tạo review mới
    @PostMapping
    public ResponseEntity<ReviewResponse> createReview(
            @Valid @RequestBody ReviewRequest req,
            @RequestHeader("Authorization") String authHeader) {
        Integer userId = getUserId(authHeader);
        return ResponseEntity.ok(reviewService.createReview(userId, req));
    }

    private Integer getUserId(String authHeader) {
        String token = authHeader.replace("Bearer ", "");
        return jwtUtil.extractUserId(token);
    }
}