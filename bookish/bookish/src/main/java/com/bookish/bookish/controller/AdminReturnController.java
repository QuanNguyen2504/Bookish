package com.bookish.bookish.controller;

import com.bookish.bookish.dto.request.AdminReturnActionRequest;
import com.bookish.bookish.dto.response.PageResponse;
import com.bookish.bookish.dto.response.ReturnRequestResponse;
import com.bookish.bookish.service.ReturnRequestService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/returns")
@RequiredArgsConstructor
public class AdminReturnController {

    private final ReturnRequestService service;

    @GetMapping
    public ResponseEntity<List<ReturnRequestResponse>> getAll() {
        return ResponseEntity.ok(service.getAllRequests());
    }

    @GetMapping("/{returnId}")
    public ResponseEntity<ReturnRequestResponse> getById(@PathVariable Integer returnId) {
        return ResponseEntity.ok(service.getById(returnId));
    }

    /** Duyệt yêu cầu: REQUESTED → APPROVED */
    @PatchMapping("/{returnId}/approve")
    public ResponseEntity<ReturnRequestResponse> approve(
            @PathVariable Integer returnId,
            @RequestBody(required = false) AdminReturnActionRequest req) {
        return ResponseEntity.ok(service.approve(returnId,
                req != null ? req : new AdminReturnActionRequest()));
    }

    /** Từ chối: REQUESTED → REJECTED */
    @PatchMapping("/{returnId}/reject")
    public ResponseEntity<ReturnRequestResponse> reject(
            @PathVariable Integer returnId,
            @RequestBody(required = false) AdminReturnActionRequest req) {
        return ResponseEntity.ok(service.reject(returnId,
                req != null ? req : new AdminReturnActionRequest()));
    }

    /** Xác nhận đã nhận lại sách: APPROVED → RETURNED + hoàn kho */
    @PatchMapping("/{returnId}/mark-returned")
    public ResponseEntity<ReturnRequestResponse> confirmReturned(@PathVariable Integer returnId) {
        return ResponseEntity.ok(service.confirmReturned(returnId));
    }

    /** Đã chuyển tiền: RETURNED → REFUNDED */
    @PatchMapping("/{returnId}/mark-refunded")
    public ResponseEntity<ReturnRequestResponse> markRefunded(
            @PathVariable Integer returnId,
            @RequestBody(required = false) AdminReturnActionRequest req) {
        return ResponseEntity.ok(service.markRefunded(returnId, req));
    }

    @GetMapping("/page")
    public ResponseEntity<PageResponse<ReturnRequestResponse>> getReturnsPaged(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String status) {
        return ResponseEntity.ok(service.getAllRequestsPaged(status, page, size));
    }
}
