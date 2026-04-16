package com.bookish.bookish.controller;

import com.bookish.bookish.dto.request.BookRequest;
import com.bookish.bookish.dto.response.BookResponse;
import com.bookish.bookish.service.BookService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/books")
@RequiredArgsConstructor
public class BookController {

    private final BookService bookService;

    // GET /books
    @GetMapping
    public ResponseEntity<List<BookResponse>> getAllBooks() {
        return ResponseEntity.ok(bookService.getAllBooks());
    }

    // GET /books/newest?limit=5
    @GetMapping("/newest")
    public ResponseEntity<List<BookResponse>> getNewestBooks(
            @RequestParam(defaultValue = "5") int limit) {
        return ResponseEntity.ok(bookService.getNewestBooks(limit));
    }

    // GET /books/top-selling?limit=5
    @GetMapping("/top-selling")
    public ResponseEntity<List<BookResponse>> getTopSellingBooks(
            @RequestParam(defaultValue = "5") int limit) {
        return ResponseEntity.ok(bookService.getTopSellingBooks(limit));
    }

    // GET /books/{id}
    @GetMapping("/{id}")
    public ResponseEntity<BookResponse> getBookById(@PathVariable Integer id) {
        return ResponseEntity.ok(bookService.getBookById(id));
    }

    // GET /books/search?keyword=...
    @GetMapping("/search")
    public ResponseEntity<List<BookResponse>> searchBooks(@RequestParam String keyword) {
        return ResponseEntity.ok(bookService.searchBooks(keyword));
    }

    // GET /books/by-category?name=Văn học
    @GetMapping("/by-category")
    public ResponseEntity<List<BookResponse>> getByCategory(@RequestParam String name) {
        return ResponseEntity.ok(bookService.getBooksByCategory(name));
    }

    // GET /books/by-author?name=Nguyễn Nhật Ánh
    @GetMapping("/by-author")
    public ResponseEntity<List<BookResponse>> getByAuthor(@RequestParam String name) {
        return ResponseEntity.ok(bookService.getBooksByAuthor(name));
    }

    // POST /books
    @PostMapping
    public ResponseEntity<BookResponse> createBook(@RequestBody BookRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(bookService.createBook(request));
    }

    // PUT /books/{id}
    @PutMapping("/{id}")
    public ResponseEntity<BookResponse> updateBook(
            @PathVariable Integer id,
            @RequestBody BookRequest request) {
        return ResponseEntity.ok(bookService.updateBook(id, request));
    }

    // DELETE /books/{id}
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteBook(@PathVariable Integer id) {
        bookService.deleteBook(id);
        return ResponseEntity.noContent().build();
    }
}