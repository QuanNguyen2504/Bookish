package com.bookish.bookish.mapper;

import com.bookish.bookish.dto.response.AuthorResponse;
import com.bookish.bookish.entity.Author;

public class AuthorMapper {

    public static Author toAuthor(com.bookish.bookish.dto.request.AuthorRequest request){

        Author author = new Author();

        author.setName(request.getName());
        author.setBio(request.getBio());
        author.setBirthDate(request.getBirthDate());

        return author;
    }

    public static AuthorResponse toAuthorResponse(Author author){

        return AuthorResponse.builder()
                .id(author.getId())
                .name(author.getName())
                .bio(author.getBio())
                .birthDate(author.getBirthDate())
                .build();
    }
}
