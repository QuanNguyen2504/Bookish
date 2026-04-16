package com.bookish.bookish.service;

import com.bookish.bookish.dto.request.CategoryRequest;
import com.bookish.bookish.dto.response.CategoryResponse;
import com.bookish.bookish.entity.Category;
import com.bookish.bookish.exception.AppException;
import com.bookish.bookish.exception.ErrorCode;
import com.bookish.bookish.mapper.CategoryMapper;
import com.bookish.bookish.repository.CategoryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class CategoryService {

    private final CategoryRepository categoryRepository;

    // GET ALL
    public List<CategoryResponse> getAllCategories() {
        return categoryRepository.findAll()
                .stream()
                .map(CategoryMapper::toCategoryResponse)
                .toList();
    }

    // CREATE
    public CategoryResponse createCategory(CategoryRequest request) {

        // Kiểm tra trùng tên
        if (categoryRepository.existsByName(request.getName())) {
            throw new AppException(ErrorCode.CATEGORY_ALREADY_EXISTS);
        }

        Category category = CategoryMapper.toCategory(request);
        categoryRepository.save(category);
        return CategoryMapper.toCategoryResponse(category);
    }

    // UPDATE
    public CategoryResponse updateCategory(Integer id, CategoryRequest request) {

        Category category = categoryRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.CATEGORY_NOT_FOUND));

        //  Đổi tên method cho khớp với CategoryRepository
        if (categoryRepository.existsByNameAndIdNot(request.getName(), id)) {
            throw new AppException(ErrorCode.CATEGORY_ALREADY_EXISTS);
        }

        category.setName(request.getName());
        categoryRepository.save(category);
        return CategoryMapper.toCategoryResponse(category);
    }

    // DELETE
    public void deleteCategory(Integer id) {

        Category category = categoryRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.CATEGORY_NOT_FOUND));

        if (category.getBooks() != null && !category.getBooks().isEmpty()) {
            throw new AppException(ErrorCode.CATEGORY_HAS_BOOK);
        }

        categoryRepository.delete(category);
    }
}