package com.bookish.bookish.controller;

import com.bookish.bookish.dto.response.ApiResponse;
import com.bookish.bookish.dto.response.WishlistResponse;
import com.bookish.bookish.security.JwtUtil;
import com.bookish.bookish.service.WishlistService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/wishlist")
@RequiredArgsConstructor
@CrossOrigin
public class WishlistController {

    private final WishlistService wishlistService;
    private final JwtUtil jwtUtil;

    @GetMapping
    public ApiResponse<List<WishlistResponse>> getMyWishlist(
            @RequestHeader("Authorization") String authHeader) {
        Integer userId = getUserId(authHeader);
        return ApiResponse.<List<WishlistResponse>>builder()
                .statusCode(200)
                .message("OK")
                .data(wishlistService.getMyWishlist(userId))
                .build();
    }


    @PostMapping("/{bookId}")
    public ApiResponse<WishlistResponse> add(
            @PathVariable Integer bookId,
            @RequestHeader("Authorization") String authHeader) {
        Integer userId = getUserId(authHeader);
        return ApiResponse.<WishlistResponse>builder()
                .statusCode(200)
                .message("Đã thêm vào danh sách yêu thích")
                .data(wishlistService.addToWishlist(userId, bookId))
                .build();
    }


    @DeleteMapping("/{bookId}")
    public ApiResponse<Void> remove(
            @PathVariable Integer bookId,
            @RequestHeader("Authorization") String authHeader) {
        Integer userId = getUserId(authHeader);
        wishlistService.removeFromWishlist(userId, bookId);
        return ApiResponse.<Void>builder()
                .statusCode(200)
                .message("Đã xoá khỏi danh sách yêu thích")
                .build();
    }


    @GetMapping("/check/{bookId}")
    public ApiResponse<Map<String, Boolean>> check(
            @PathVariable Integer bookId,
            @RequestHeader("Authorization") String authHeader) {
        Integer userId = getUserId(authHeader);
        boolean liked = wishlistService.isInWishlist(userId, bookId);
        return ApiResponse.<Map<String, Boolean>>builder()
                .statusCode(200)
                .message("OK")
                .data(Map.of("inWishlist", liked))
                .build();
    }


    @GetMapping("/count")
    public ApiResponse<Map<String, Long>> count(
            @RequestHeader("Authorization") String authHeader) {
        Integer userId = getUserId(authHeader);
        return ApiResponse.<Map<String, Long>>builder()
                .statusCode(200)
                .message("OK")
                .data(Map.of("count", wishlistService.countMyWishlist(userId)))
                .build();
    }

    private Integer getUserId(String authHeader) {
        String token = authHeader.replace("Bearer ", "");
        return jwtUtil.extractUserId(token);
    }
}
