package com.bookish.bookish.dto.request;

import lombok.*;
import java.math.BigDecimal;
import java.util.Set;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BookRequest {
    private String title;
    private String description;
    private BigDecimal price;
    private Integer stock;
    private Integer salePercent;
    private String image;
    private Set<Integer> authorIds;
    private Set<Integer> categoryIds;
}