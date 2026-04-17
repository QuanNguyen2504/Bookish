package com.bookish.bookish.service;

import com.bookish.bookish.dto.request.BookRequest;
import com.bookish.bookish.dto.response.BookResponse;
import com.bookish.bookish.dto.response.PageResponse;
import com.bookish.bookish.entity.Author;
import com.bookish.bookish.entity.Book;
import com.bookish.bookish.entity.Category;
import com.bookish.bookish.mapper.BookMapper;
import com.bookish.bookish.repository.*;
import com.bookish.bookish.exception.AppException;
import com.bookish.bookish.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class BookService {

    private final BookRepository bookRepository;
    private final AuthorRepository authorRepository;
    private final CategoryRepository categoryRepository;
    private final CartItemRepository cartItemRepository;
    private final BookMapper bookMapper;
    private final ReviewRepository reviewRepository;
    private final OrderItemRepository orderItemRepository;

    private BookResponse toResponseWithRating(Book book) {
        BookResponse res = bookMapper.toResponse(book);
        Double avg = reviewRepository.findAvgRatingByBook(book);
        long count = reviewRepository.findByBookOrderByCreatedAtDesc(book).size();
        res.setAvgRating(avg != null ? Math.round(avg * 10.0) / 10.0 : 0.0);
        res.setReviewCount((int) count);
        return res;
    }



    public BookResponse getBookById(Integer id) {
        return toResponseWithRating(bookRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.BOOK_NOT_FOUND)));
    }

    public List<BookResponse> getAllBooks() {
        return bookRepository.findByDeletedFalse().stream()
                .map(this::toResponseWithRating).collect(Collectors.toList());
    }

    public List<BookResponse> searchBooks(String keyword) {
        return bookRepository.findByDeletedFalseAndTitleContainingIgnoreCase(keyword)
                .stream().map(this::toResponseWithRating).collect(Collectors.toList());
    }

    public List<BookResponse> getBooksByCategory(String categoryName) {
        return bookRepository.findByCategoryName(categoryName)
                .stream().map(this::toResponseWithRating).collect(Collectors.toList());
    }

    public List<BookResponse> getBooksByAuthor(String authorName) {
        return bookRepository.findByAuthorName(authorName)
                .stream().map(this::toResponseWithRating).collect(Collectors.toList());
    }

    public List<BookResponse> getNewestBooks(int limit) {
        return bookRepository.findTop5ByOrderByCreatedAtDesc(PageRequest.of(0, limit))
                .stream().map(this::toResponseWithRating).collect(Collectors.toList());
    }

    public List<BookResponse> getTopSellingBooks(int limit) {
        return bookRepository.findTopSellingBooks(PageRequest.of(0, limit))
                .stream().map(this::toResponseWithRating).collect(Collectors.toList());
    }




    public PageResponse<BookResponse> getBooksPaged(
            String keyword, Integer categoryId, int page, int size, String sortBy) {

        Sort sort = buildSort(sortBy);
        Pageable pageable = PageRequest.of(page, size, sort);

        Page<Book> bookPage;
        if (categoryId != null) {
            bookPage = bookRepository.findAllPagedWithCategory(keyword, categoryId, pageable);
        } else {
            bookPage = bookRepository.findAllPaged(keyword, pageable);
        }

        List<BookResponse> content = bookPage.getContent().stream()
                .map(this::toResponseWithRating).toList();

        return PageResponse.from(bookPage, content);
    }


    public PageResponse<BookResponse> getActiveBooksPaged(
            String keyword, Integer categoryId, int page, int size, String sortBy) {

        Sort sort = buildSort(sortBy);
        Pageable pageable = PageRequest.of(page, size, sort);

        Page<Book> bookPage = bookRepository.findActivePagedWithCategory(keyword, categoryId, pageable);

        List<BookResponse> content = bookPage.getContent().stream()
                .map(this::toResponseWithRating).toList();

        return PageResponse.from(bookPage, content);
    }

    private Sort buildSort(String sortBy) {
        if (sortBy == null) return Sort.by(Sort.Direction.DESC, "createdAt");
        return switch (sortBy) {
            case "price_asc"  -> Sort.by(Sort.Direction.ASC, "price");
            case "price_desc" -> Sort.by(Sort.Direction.DESC, "price");
            case "name_asc"   -> Sort.by(Sort.Direction.ASC, "title");
            case "name_desc"  -> Sort.by(Sort.Direction.DESC, "title");
            case "oldest"     -> Sort.by(Sort.Direction.ASC, "createdAt");
            case "stock_asc"  -> Sort.by(Sort.Direction.ASC, "stock");
            case "stock_desc" -> Sort.by(Sort.Direction.DESC, "stock");
            default           -> Sort.by(Sort.Direction.DESC, "createdAt"); // newest
        };
    }

    // ===================== CUD (giữ nguyên) =====================

    public BookResponse createBook(BookRequest request) {
        Set<Author> authors = new HashSet<>(authorRepository.findAllById(request.getAuthorIds()));
        Set<Category> categories = new HashSet<>(categoryRepository.findAllById(request.getCategoryIds()));
        Book book = Book.builder()
                .title(request.getTitle()).description(request.getDescription())
                .price(request.getPrice()).stock(request.getStock())
                .salePercent(request.getSalePercent()).image(request.getImage())
                .createdAt(LocalDateTime.now()).authors(authors).categories(categories).build();
        return toResponseWithRating(bookRepository.save(book));
    }

    public BookResponse updateBook(Integer id, BookRequest request) {
        Book book = bookRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.BOOK_NOT_FOUND));
        book.setTitle(request.getTitle()); book.setDescription(request.getDescription());
        book.setPrice(request.getPrice()); book.setStock(request.getStock());
        book.setSalePercent(request.getSalePercent()); book.setImage(request.getImage());
        book.setAuthors(new HashSet<>(authorRepository.findAllById(request.getAuthorIds())));
        book.setCategories(new HashSet<>(categoryRepository.findAllById(request.getCategoryIds())));
        return toResponseWithRating(bookRepository.save(book));
    }

    @Transactional
    public void deleteBook(Integer id) {
        Book book = bookRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.BOOK_NOT_FOUND));

        long activeOrders = orderItemRepository.countActiveOrdersByBook(book);
        if (activeOrders > 0) {
            throw new AppException(ErrorCode.BOOK_HAS_ACTIVE_ORDERS);
        }

        book.setDeleted(true);
        bookRepository.save(book);
    }
}