package com.bookish.bookish.mapper;

import com.bookish.bookish.dto.response.CustomerResponse;
import com.bookish.bookish.entity.User;

public class UserMapper {

    public static CustomerResponse toCustomerResponse(User user) {
        return CustomerResponse.builder()
                .id(user.getId())
                .username(user.getUsername())
                .email(user.getEmail())
                .phone(user.getPhone())
                .address(user.getAddress())
                .avatarUrl(user.getAvatarUrl())  // 👈 THÊM MỚI
                .role(user.getRole())
                .createdAt(user.getCreatedAt())
                .build();
    }
}