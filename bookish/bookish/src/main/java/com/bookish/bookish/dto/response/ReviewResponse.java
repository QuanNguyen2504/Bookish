package com.bookish.bookish.dto.response;

import lombok.Builder;
import lombok.Getter;
import java.time.LocalDateTime;

@Getter @Builder
public class ReviewResponse {
    private Integer reviewId;
    private Integer userId;
    private String username;
    private String avatarUrl;
    private Integer bookId;
    private Integer rating;
    private String comment;
    private LocalDateTime createdAt;
}