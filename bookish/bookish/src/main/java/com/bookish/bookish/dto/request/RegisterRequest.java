package com.bookish.bookish.dto.request;

import jakarta.validation.constraints.*;
import lombok.Data;

@Data
public class RegisterRequest {

    @NotBlank(message = "Username không được để trống")
    private String username;

    @Email(message = "Email không hợp lệ")
    @NotBlank(message = "Email không được để trống")
    private String email;

    @NotBlank(message = "Password không được để trống")
    @Pattern(
            regexp = "^(?=.*[A-Z]).{8,}$",
            message = "Password phải ít nhất 8 ký tự và có ít nhất 1 chữ hoa"
    )
    private String password;
}