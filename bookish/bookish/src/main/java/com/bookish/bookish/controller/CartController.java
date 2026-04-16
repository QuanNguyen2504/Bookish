package com.bookish.bookish.controller;

import com.bookish.bookish.dto.request.AddToCartRequest;
import com.bookish.bookish.dto.request.UpdateCartItemRequest;
import com.bookish.bookish.dto.response.CartResponse;
import com.bookish.bookish.service.CartService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/cart")
@RequiredArgsConstructor
public class CartController {

    private final CartService cartService;

    // GET /api/cart
    @GetMapping
    public ResponseEntity<CartResponse> getCart(
            @RequestAttribute("userId") Integer userId) {
        return ResponseEntity.ok(cartService.getCart(userId));
    }

    // POST /api/cart/add
    @PostMapping("/add")
    public ResponseEntity<CartResponse> addToCart(
            @RequestAttribute("userId") Integer userId,
            @RequestBody AddToCartRequest req) {
        return ResponseEntity.ok(cartService.addToCart(userId, req));
    }

    // PUT /api/cart/{cartItemId}
    @PutMapping("/{cartItemId}")
    public ResponseEntity<CartResponse> updateQuantity(
            @RequestAttribute("userId") Integer userId,
            @PathVariable Integer cartItemId,
            @RequestBody UpdateCartItemRequest req) {
        return ResponseEntity.ok(cartService.updateQuantity(userId, cartItemId, req));
    }

    // DELETE /api/cart/{cartItemId}
    @DeleteMapping("/{cartItemId}")
    public ResponseEntity<CartResponse> removeItem(
            @RequestAttribute("userId") Integer userId,
            @PathVariable Integer cartItemId) {
        return ResponseEntity.ok(cartService.removeItem(userId, cartItemId));
    }

    // DELETE /api/cart — xóa toàn bộ giỏ hàng
    @DeleteMapping
    public ResponseEntity<CartResponse> clearCart(
            @RequestAttribute("userId") Integer userId) {
        return ResponseEntity.ok(cartService.clearCart(userId));
    }
}