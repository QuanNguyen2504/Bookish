package com.bookish.bookish.mapper;

import com.bookish.bookish.dto.response.BookResponse;
import com.bookish.bookish.entity.Book;
import org.springframework.stereotype.Component;

import java.util.stream.Collectors;

@Component
public class BookMapper {

    public BookResponse toResponse(Book book) {
        return BookResponse.builder()
                .bookId(book.getBook_id())
                .title(book.getTitle())
                .description(book.getDescription())
                .price(book.getPrice())
                .stock(book.getStock())
                .salePercent(book.getSalePercent())
                .image(book.getImage())
                .createdAt(book.getCreatedAt())
                .authors(
                        book.getAuthors() == null ? null :
                                book.getAuthors().stream()
                                        .map(a -> a.getName()) // đổi theo field tên của Author
                                        .collect(Collectors.toSet())
                )
                .categories(
                        book.getCategories() == null ? null :
                                book.getCategories().stream()
                                        .map(c -> c.getName()) // đổi theo field tên của Category
                                        .collect(Collectors.toSet())
                )
                .build();
    }
}