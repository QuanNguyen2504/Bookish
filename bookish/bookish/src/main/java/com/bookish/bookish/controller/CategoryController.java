package com.bookish.bookish.controller;

import com.bookish.bookish.dto.request.CategoryRequest;
import com.bookish.bookish.dto.response.ApiResponse;
import com.bookish.bookish.dto.response.CategoryResponse;
import com.bookish.bookish.service.CategoryService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/categories")
@RequiredArgsConstructor
public class CategoryController {

    private final CategoryService categoryService;

    // GET ALL
    @GetMapping
    public ApiResponse<List<CategoryResponse>> getAllCategories(){

        return ApiResponse.<List<CategoryResponse>>builder()
                .statusCode(200)
                .message("Get categories successfully")
                .data(categoryService.getAllCategories())
                .build();
    }

    // CREATE
    @PostMapping
    public ApiResponse<CategoryResponse> createCategory(
            @RequestBody CategoryRequest request){

        CategoryResponse response = categoryService.createCategory(request);

        return ApiResponse.<CategoryResponse>builder()
                .statusCode(201)
                .message("Create category successfully")
                .data(response)
                .build();
    }

    // UPDATE
    @PutMapping("/{id}")
    public ApiResponse<CategoryResponse> updateCategory(
            @PathVariable Integer id,
            @RequestBody CategoryRequest request){

        CategoryResponse response = categoryService.updateCategory(id, request);

        return ApiResponse.<CategoryResponse>builder()
                .statusCode(200)
                .message("Update category successfully")
                .data(response)
                .build();
    }

    // DELETE
    @DeleteMapping("/{id}")
    public ApiResponse<Void> deleteCategory(@PathVariable Integer id){

        categoryService.deleteCategory(id);

        return ApiResponse.<Void>builder()
                .statusCode(200)
                .message("Delete category successfully")
                .build();
    }
}