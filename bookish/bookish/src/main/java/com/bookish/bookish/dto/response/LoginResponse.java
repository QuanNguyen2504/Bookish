package com.bookish.bookish.dto.response;

import com.bookish.bookish.entity.Role;
import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class LoginResponse {
    private String token;
    private Role role;
    private Integer id;
    private String username;
    private String avatarUrl; // thêm để frontend lưu vào store khi login
}