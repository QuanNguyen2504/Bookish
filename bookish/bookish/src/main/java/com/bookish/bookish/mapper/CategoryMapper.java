package com.bookish.bookish.mapper;

import com.bookish.bookish.dto.request.CategoryRequest;
import com.bookish.bookish.dto.response.CategoryResponse;
import com.bookish.bookish.entity.Category;

public class CategoryMapper {

    public static CategoryResponse toCategoryResponse(Category category){

        return CategoryResponse.builder()
                .id(category.getCategory_id())
                .name(category.getName())
                .build();
    }

    public static Category toCategory(CategoryRequest request){

        return Category.builder()
                .name(request.getName())
                .build();
    }

    public static void updateCategory(Category category, CategoryRequest request){

        category.setName(request.getName());
    }
}