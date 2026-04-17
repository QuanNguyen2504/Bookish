package com.bookish.bookish.controller;

import com.bookish.bookish.dto.request.BookRequest;
import com.bookish.bookish.dto.response.BookResponse;
import com.bookish.bookish.dto.response.PageResponse;
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

    // ===================== API PHÂN TRANG MỚI =====================

    /**
     * GET /books/page?page=0&size=10&keyword=abc&categoryId=1&sort=newest
     * Dành cho user — chỉ lấy sách chưa xóa
     */
    @GetMapping("/page")
    public ResponseEntity<PageResponse<BookResponse>> getActiveBooksPaged(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "12") int size,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) Integer categoryId,
            @RequestParam(required = false, defaultValue = "newest") String sort) {
        return ResponseEntity.ok(bookService.getActiveBooksPaged(keyword, categoryId, page, size, sort));
    }

    /**
     * Dành cho admin — lấy tất cả sách kể cả đã xóa
     */
    @GetMapping("/admin/page")
    public ResponseEntity<PageResponse<BookResponse>> getBooksPaged(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) Integer categoryId,
            @RequestParam(required = false, defaultValue = "newest") String sort) {
        return ResponseEntity.ok(bookService.getBooksPaged(keyword, categoryId, page, size, sort));
    }

    // ===================== API CŨ (giữ nguyên) =====================

    @GetMapping
    public ResponseEntity<List<BookResponse>> getAllBooks() {
        return ResponseEntity.ok(bookService.getAllBooks());
    }

    @GetMapping("/newest")
    public ResponseEntity<List<BookResponse>> getNewestBooks(
            @RequestParam(defaultValue = "5") int limit) {
        return ResponseEntity.ok(bookService.getNewestBooks(limit));
    }

    @GetMapping("/top-selling")
    public ResponseEntity<List<BookResponse>> getTopSellingBooks(
            @RequestParam(defaultValue = "5") int limit) {
        return ResponseEntity.ok(bookService.getTopSellingBooks(limit));
    }

    @GetMapping("/{id}")
    public ResponseEntity<BookResponse> getBookById(@PathVariable Integer id) {
        return ResponseEntity.ok(bookService.getBookById(id));
    }

    @GetMapping("/search")
    public ResponseEntity<List<BookResponse>> searchBooks(@RequestParam String keyword) {
        return ResponseEntity.ok(bookService.searchBooks(keyword));
    }

    @GetMapping("/by-category")
    public ResponseEntity<List<BookResponse>> getByCategory(@RequestParam String name) {
        return ResponseEntity.ok(bookService.getBooksByCategory(name));
    }

    @GetMapping("/by-author")
    public ResponseEntity<List<BookResponse>> getByAuthor(@RequestParam String name) {
        return ResponseEntity.ok(bookService.getBooksByAuthor(name));
    }

    @PostMapping
    public ResponseEntity<BookResponse> createBook(@RequestBody BookRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(bookService.createBook(request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<BookResponse> updateBook(
            @PathVariable Integer id,
            @RequestBody BookRequest request) {
        return ResponseEntity.ok(bookService.updateBook(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteBook(@PathVariable Integer id) {
        bookService.deleteBook(id);
        return ResponseEntity.noContent().build();
    }
}