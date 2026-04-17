package com.bookish.bookish.controller;

import com.bookish.bookish.dto.request.PromotionRequest;
import com.bookish.bookish.dto.request.PromotionValidateRequest;
import com.bookish.bookish.dto.response.PageResponse;
import com.bookish.bookish.dto.response.PromotionApplyResponse;
import com.bookish.bookish.dto.response.PromotionResponse;
import com.bookish.bookish.service.PromotionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/promotions")
@RequiredArgsConstructor
@CrossOrigin
public class PromotionController {

    private final PromotionService service;

    @PostMapping
    public PromotionResponse create(@RequestBody PromotionRequest request) {
        return service.create(request);
    }

    @PutMapping("/{id}")
    public PromotionResponse update(@PathVariable Integer id,
                                    @RequestBody PromotionRequest request) {
        return service.update(id, request);
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Integer id) {
        service.delete(id);
    }

    @GetMapping("/{id}")
    public PromotionResponse getById(@PathVariable Integer id) {
        return service.getById(id);
    }

    @GetMapping
    public List<PromotionResponse> getAll() {
        return service.getAll();
    }

    /**
     *  Validate mã tại giỏ hàng — kiểm tra đầy đủ điều kiện.
     * Body: { code, totalAmount, shippingFee, appliedCodes: [...] }
     */
    @PostMapping("/validate")
    public PromotionApplyResponse validate(
            @RequestAttribute(value = "userId", required = false) Integer userId,
            @RequestBody PromotionValidateRequest request) {
        return service.validate(userId, request);
    }

    @GetMapping("/page")
    public ResponseEntity<PageResponse<PromotionResponse>> getPromotionsPaged(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String keyword) {
        return ResponseEntity.ok(service.getPromotionsPaged(keyword, page, size));
    }
    @GetMapping("/all")
    public ResponseEntity<List<PromotionResponse>> getAllForAdmin() {
        return ResponseEntity.ok(service.getAllForAdmin());
    }
}