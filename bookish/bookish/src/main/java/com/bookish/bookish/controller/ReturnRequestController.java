package com.bookish.bookish.controller;

import com.bookish.bookish.dto.request.CreateReturnRequest;
import com.bookish.bookish.dto.request.UpdateBankInfoRequest;
import com.bookish.bookish.dto.response.ReturnRequestResponse;
import com.bookish.bookish.service.ReturnRequestService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/returns")
@RequiredArgsConstructor
public class ReturnRequestController {

    private final ReturnRequestService service;

    /** User gửi yêu cầu hoàn trả */
    @PostMapping
    public ResponseEntity<ReturnRequestResponse> create(
            @RequestAttribute("userId") Integer userId,
            @Valid @RequestBody CreateReturnRequest req) {
        return ResponseEntity.ok(service.createRequest(userId, req));
    }

    /** User xem các yêu cầu của mình */
    @GetMapping("/my")
    public ResponseEntity<List<ReturnRequestResponse>> getMyRequests(
            @RequestAttribute("userId") Integer userId) {
        return ResponseEntity.ok(service.getMyRequests(userId));
    }

    /** User cập nhật thông tin ngân hàng */
    @PatchMapping("/{returnId}/bank-info")
    public ResponseEntity<ReturnRequestResponse> updateBankInfo(
            @RequestAttribute("userId") Integer userId,
            @PathVariable Integer returnId,
            @Valid @RequestBody UpdateBankInfoRequest req) {
        return ResponseEntity.ok(service.updateBankInfo(userId, returnId, req));
    }

    /** User hủy yêu cầu khi còn REQUESTED */
    @PatchMapping("/{returnId}/cancel")
    public ResponseEntity<ReturnRequestResponse> cancel(
            @RequestAttribute("userId") Integer userId,
            @PathVariable Integer returnId) {
        return ResponseEntity.ok(service.cancelRequest(userId, returnId));
    }
}