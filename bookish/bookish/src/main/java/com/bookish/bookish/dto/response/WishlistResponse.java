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
public class WishlistResponse {


    private Integer wishlistId;

    private LocalDateTime addedAt;

    private Integer bookId;
    private String title;
    private BigDecimal price;
    private Integer salePercent;
    private String image;
    private Integer stock;
    private Set<String> authors;
    private Set<String> categories;
    private Double avgRating;
}
