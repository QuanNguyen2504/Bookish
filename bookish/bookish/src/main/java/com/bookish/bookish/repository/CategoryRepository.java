package com.bookish.bookish.repository;

import com.bookish.bookish.entity.Category;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface CategoryRepository extends JpaRepository<Category, Integer> {

    @Query("SELECT COUNT(c) > 0 FROM Category c WHERE c.name = :name")
    boolean existsByName(@Param("name") String name);

    @Query("SELECT COUNT(c) > 0 FROM Category c WHERE c.name = :name AND c.category_id != :id")
    boolean existsByNameAndIdNot(@Param("name") String name, @Param("id") Integer id);

    @Query("SELECT c FROM Category c WHERE (:keyword IS NULL OR LOWER(c.name) LIKE LOWER(CONCAT('%', :keyword, '%')))")
    Page<Category> findAllPaged(@Param("keyword") String keyword, Pageable pageable);
}