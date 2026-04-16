package com.bookish.bookish.dto.response;

import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Set;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BookResponse {
    private Integer bookId;
    private String title;
    private String description;
    private BigDecimal price;
    private Integer stock;
    private Integer salePercent;
    private String image;
    private LocalDateTime createdAt;
    private Set<String> authors;    // tên tác giả
    private Set<String> categories; // tên danh mục
    private Double avgRating;       // rating trung bình
    private Integer reviewCount;    // số lượng đánh giá
}