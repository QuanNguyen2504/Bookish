package com.bookish.bookish.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;

@Getter
public class ReviewRequest {
    @NotNull
    private Integer bookId;

    @NotNull @Min(1) @Max(5)
    private Integer rating;

    private String comment;
}