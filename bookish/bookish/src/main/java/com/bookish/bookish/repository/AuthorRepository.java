package com.bookish.bookish.repository;

import com.bookish.bookish.entity.Author;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AuthorRepository extends JpaRepository<Author, Integer> {
    // Kiểm tra trùng tên
    boolean existsByName(String name);

    // Kiểm tra trùng tên khi update (loại trừ chính nó)
    boolean existsByNameAndIdNot(String name, Integer id);

}