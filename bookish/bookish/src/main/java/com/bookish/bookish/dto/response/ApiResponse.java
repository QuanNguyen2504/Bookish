package com.bookish.bookish.dto.response;

import lombok.*;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ApiResponse<T> {

    private int statusCode;

    private String message;

    private String error;

    private T data;
}
