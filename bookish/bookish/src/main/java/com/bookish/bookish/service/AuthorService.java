package com.bookish.bookish.service;

import com.bookish.bookish.dto.request.AuthorRequest;
import com.bookish.bookish.dto.response.AuthorResponse;
import com.bookish.bookish.entity.Author;
import com.bookish.bookish.exception.AppException;
import com.bookish.bookish.exception.ErrorCode;
import com.bookish.bookish.mapper.AuthorMapper;
import com.bookish.bookish.repository.AuthorRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class AuthorService {

    private final AuthorRepository authorRepository;

    public AuthorService(AuthorRepository authorRepository) {
        this.authorRepository = authorRepository;
    }

    // tạo tác giả
    public AuthorResponse createAuthor(AuthorRequest request) {

        // Kiểm tra trùng tên
        if (authorRepository.existsByName(request.getName())) {
            throw new AppException(ErrorCode.AUTHOR_ALREADY_EXISTS);
        }

        Author author = AuthorMapper.toAuthor(request);
        Author savedAuthor = authorRepository.save(author);
        return AuthorMapper.toAuthorResponse(savedAuthor);
    }

    // lấy tất cả tác giả
    public List<AuthorResponse> getAllAuthors() {
        return authorRepository.findAll()
                .stream()
                .map(AuthorMapper::toAuthorResponse)
                .toList();
    }

    // sửa tác giả
    public AuthorResponse updateAuthor(Integer id, AuthorRequest request) {

        Author author = authorRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.AUTHOR_NOT_FOUND));

        // Kiểm tra trùng tên (loại trừ chính nó)
        if (authorRepository.existsByNameAndIdNot(request.getName(), id)) {
            throw new AppException(ErrorCode.AUTHOR_ALREADY_EXISTS);
        }

        author.setName(request.getName());
        author.setBio(request.getBio());
        author.setBirthDate(request.getBirthDate());

        Author updated = authorRepository.save(author);
        return AuthorMapper.toAuthorResponse(updated);
    }

    // xóa tác giả
    public void deleteAuthor(Integer id) {

        Author author = authorRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.AUTHOR_NOT_FOUND));

        // Kiểm tra còn sách không
        if (author.getBooks() != null && !author.getBooks().isEmpty()) {
            throw new AppException(ErrorCode.AUTHOR_HAS_BOOKS);
        }

        authorRepository.delete(author);
    }
}