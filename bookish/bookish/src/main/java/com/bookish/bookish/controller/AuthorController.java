package com.bookish.bookish.controller;

import com.bookish.bookish.dto.request.AuthorRequest;
import com.bookish.bookish.dto.response.AuthorResponse;
import com.bookish.bookish.dto.response.PageResponse;
import com.bookish.bookish.service.AuthorService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/authors")
@CrossOrigin
public class AuthorController {

    private final AuthorService authorService;

    public AuthorController(AuthorService authorService) {
        this.authorService = authorService;
    }

    @GetMapping
    public List<AuthorResponse> getAllAuthors() {
        return authorService.getAllAuthors();
    }

    @PostMapping
    public AuthorResponse createAuthor(@RequestBody AuthorRequest request) {
        return authorService.createAuthor(request);
    }

    @PutMapping("/{id}")
    public AuthorResponse updateAuthor(@PathVariable Integer id,
                                       @RequestBody AuthorRequest request) {
        return authorService.updateAuthor(id, request);
    }

    //  Trả về 204 No Content thay vì String
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteAuthor(@PathVariable Integer id) {
        authorService.deleteAuthor(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/page")
    public ResponseEntity<PageResponse<AuthorResponse>> getAuthorsPaged(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String keyword) {
        return ResponseEntity.ok(authorService.getAuthorsPaged(keyword, page, size));
    }
}