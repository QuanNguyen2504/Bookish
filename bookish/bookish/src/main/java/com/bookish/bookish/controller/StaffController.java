package com.bookish.bookish.controller;

import com.bookish.bookish.dto.request.CreateStaffRequest;
import com.bookish.bookish.dto.response.CustomerResponse;
import com.bookish.bookish.service.UserService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/staff")
public class StaffController {

    private final UserService userService;

    public StaffController(UserService userService) {
        this.userService = userService;
    }

    // Lấy danh sách nhân viên
    @GetMapping
    public List<CustomerResponse> getAllStaff() {
        return userService.getAllStaff();
    }

    // Tạo nhân viên
    @PostMapping
    public CustomerResponse createStaff(@RequestBody CreateStaffRequest request) {
        return userService.createStaff(request);
    }
}