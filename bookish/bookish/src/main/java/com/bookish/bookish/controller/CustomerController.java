package com.bookish.bookish.controller;

import com.bookish.bookish.dto.request.ChangePasswordRequest;
import com.bookish.bookish.dto.response.CustomerResponse;
import com.bookish.bookish.dto.response.PageResponse;
import com.bookish.bookish.entity.User;
import com.bookish.bookish.security.JwtUtil;
import com.bookish.bookish.service.UserService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/customers")
public class CustomerController {

    private final UserService userService;
    private final JwtUtil jwtUtil;

    public CustomerController(UserService userService, JwtUtil jwtUtil) {
        this.userService = userService;
        this.jwtUtil = jwtUtil;
    }

    // Lấy tất cả khách hàng
    @GetMapping
    public List<CustomerResponse> getAllCustomers() {
        return userService.getAllCustomers();
    }

    // Thêm khách hàng
    @PostMapping
    public CustomerResponse createCustomer(@RequestBody User user) {
        return userService.createCustomers(user);
    }

    // Sửa khách hàng
    @PutMapping("/{id}")
    public CustomerResponse updateCustomer(@PathVariable Integer id,
                                           @RequestBody User user) {
        return userService.updateCustomer(id, user);
    }

    // Xóa khách hàng
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteCustomer(@PathVariable Integer id) {
        userService.deleteCustomer(id);
        return ResponseEntity.noContent().build();
    }

    // Đổi mật khẩu
    @PatchMapping("/{id}/change-password")
    public ResponseEntity<Void> changePassword(
            @PathVariable Integer id,
            @Valid @RequestBody ChangePasswordRequest req,
            @RequestHeader("Authorization") String authHeader) {
        Integer tokenUserId = jwtUtil.extractUserId(authHeader.replace("Bearer ", ""));
        if (!tokenUserId.equals(id)) {
            return ResponseEntity.status(403).build();
        }
        userService.changePassword(id, req);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/admin/page")
    public ResponseEntity<PageResponse<CustomerResponse>> getUsersPaged(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String keyword) {
        return ResponseEntity.ok(userService.getUsersPaged(keyword, page, size));
    }
}