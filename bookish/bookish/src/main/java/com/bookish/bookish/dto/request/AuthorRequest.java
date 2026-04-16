package com.bookish.bookish.dto.request;

import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;

@Getter
@Setter
public class AuthorRequest {

    private String name;
    private String bio;
    private LocalDate birthDate;
}
