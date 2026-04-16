package com.bookish.bookish.controller;

import com.bookish.bookish.dto.request.LoginRequest;
import com.bookish.bookish.dto.response.LoginResponse;
import com.bookish.bookish.dto.response.CustomerResponse;
import com.bookish.bookish.dto.request.RegisterRequest;
import com.bookish.bookish.dto.response.ApiResponse;
import com.bookish.bookish.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/auth")
@CrossOrigin
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/login")
    public ApiResponse<LoginResponse> login(@RequestBody LoginRequest request) {
        LoginResponse response = authService.login(request);
        return ApiResponse.<LoginResponse>builder()
                .statusCode(200)
                .message("Login successful")
                .data(response)
                .build();
    }

    @PostMapping("/register")
    public ApiResponse<CustomerResponse> register(
            @Valid @RequestBody RegisterRequest request) {
        CustomerResponse response = authService.register(request);
        return ApiResponse.<CustomerResponse>builder()
                .statusCode(200)
                .message("Đăng ký thành công. Vui lòng kiểm tra email để xác thực tài khoản")
                .data(response)
                .build();
    }

    @PostMapping("/logout")
    public ApiResponse<Void> logout() {
        return ApiResponse.<Void>builder()
                .statusCode(200)
                .message("Logout successful")
                .build();
    }



    @PostMapping("/change-email")
    public ApiResponse<Void> changeEmail(@RequestBody Map<String, String> body) {
        String username = body.get("username");
        String password = body.get("password");
        String newEmail = body.get("newEmail");

        authService.changeEmailBeforeVerify(username, password, newEmail);

        return ApiResponse.<Void>builder()
                .statusCode(200)
                .message("Đã gửi email xác thực đến địa chỉ mới. Vui lòng kiểm tra hộp thư")
                .build();
    }

    // VERIFY
    @PostMapping("/verify-email")
    public ApiResponse<LoginResponse> verifyEmail(@RequestBody Map<String, String> body) {
        String email = body.get("email");
        String code = body.get("code");
        LoginResponse response = authService.verifyEmail(email, code);
        return ApiResponse.<LoginResponse>builder()
                .statusCode(200)
                .message("Xác thực thành công")
                .data(response)
                .build();
    }

    // RESEND
    @PostMapping("/resend-verification")
    public ApiResponse<Void> resendVerification(@RequestBody Map<String, String> body) {
        String email = body.get("email");
        authService.resendVerificationCode(email);
        return ApiResponse.<Void>builder()
                .statusCode(200)
                .message("Đã gửi lại mã xác thực")
                .build();
    }

    @PostMapping("/forgot-password")
    public ApiResponse<Void> forgotPassword(@RequestBody Map<String, String> body) {
        String email = body.get("email");
        authService.forgotPassword(email);
        return ApiResponse.<Void>builder()
                .statusCode(200)
                .message("Mã đặt lại mật khẩu đã được gửi đến email của bạn")
                .build();
    }

    @PostMapping("/reset-password")
    public ApiResponse<Void> resetPassword(@RequestBody Map<String, String> body) {
        String email = body.get("email");
        String code = body.get("code");
        String newPassword = body.get("newPassword");
        authService.resetPassword(email, code, newPassword);
        return ApiResponse.<Void>builder()
                .statusCode(200)
                .message("Đặt lại mật khẩu thành công. Vui lòng đăng nhập lại")
                .build();
    }
}
