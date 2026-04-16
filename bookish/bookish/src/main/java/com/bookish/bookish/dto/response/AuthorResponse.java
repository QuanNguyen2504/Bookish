package com.bookish.bookish.dto.response;

import lombok.Builder;
import lombok.Getter;

import java.time.LocalDate;

@Getter
@Builder
public class AuthorResponse {

    private Integer id;
    private String name;
    private String bio;
    private LocalDate birthDate;
}
