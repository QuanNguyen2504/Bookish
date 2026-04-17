package com.bookish.bookish.repository;

import com.bookish.bookish.entity.Author;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AuthorRepository extends JpaRepository<Author, Integer> {
    // Kiểm tra trùng tên
    boolean existsByName(String name);

    // Kiểm tra trùng tên khi update (loại trừ chính nó)
    boolean existsByNameAndIdNot(String name, Integer id);

    @Query("SELECT a FROM Author a WHERE (:keyword IS NULL OR LOWER(a.name) LIKE LOWER(CONCAT('%', :keyword, '%')))")
    Page<Author> findAllPaged(@Param("keyword") String keyword, Pageable pageable);
}