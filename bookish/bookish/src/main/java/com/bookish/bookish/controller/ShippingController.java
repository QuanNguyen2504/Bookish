package com.bookish.bookish.controller;

import com.bookish.bookish.dto.request.ShippingFeeRequest;
import com.bookish.bookish.dto.response.ShippingFeeResponse;
import com.bookish.bookish.service.ShippingService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/shipping")
@RequiredArgsConstructor
public class ShippingController {

    private final ShippingService shippingService;


    @PostMapping("/calculate")
    public ResponseEntity<ShippingFeeResponse> calculateShippingFee(
            @RequestBody ShippingFeeRequest request) {
        return ResponseEntity.ok(
                shippingService.calculateShippingFee(request.getDestinationAddress())
        );
    }
}