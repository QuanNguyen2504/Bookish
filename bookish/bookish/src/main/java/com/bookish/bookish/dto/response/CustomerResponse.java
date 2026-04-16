package com.bookish.bookish.dto.response;

import com.bookish.bookish.entity.Role;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CustomerResponse {

    private Integer id;

    private String username;

    private String email;

    private String phone;

    private String address;

    private String avatarUrl;  // THÊM MỚI

    private Role role;

    private LocalDateTime createdAt;
}