package com.bookish.bookish.controller;

import com.bookish.bookish.dto.response.StatsResponse;
import com.bookish.bookish.service.AdminStatsService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/stats")
@RequiredArgsConstructor
public class AdminStatsController {

    private final AdminStatsService adminStatsService;

    @GetMapping("/summary")
    public ResponseEntity<StatsResponse.Summary> getSummary() {
        return ResponseEntity.ok(adminStatsService.getSummary());
    }

    @GetMapping("/revenue")
    public ResponseEntity<List<StatsResponse.MonthlyRevenue>> getMonthlyRevenue() {
        return ResponseEntity.ok(adminStatsService.getMonthlyRevenue());
    }

    @GetMapping("/daily")
    public ResponseEntity<List<StatsResponse.DailyOrders>> getDailyOrders() {
        return ResponseEntity.ok(adminStatsService.getDailyOrders());
    }

    @GetMapping("/top-books")
    public ResponseEntity<List<StatsResponse.TopBook>> getTopBooks(
            @RequestParam(defaultValue = "10") int limit) {
        return ResponseEntity.ok(adminStatsService.getTopBooks(limit));
    }

    @GetMapping("/categories")
    public ResponseEntity<List<StatsResponse.CategoryStat>> getCategoryStats() {
        return ResponseEntity.ok(adminStatsService.getCategoryStats());
    }

    @GetMapping("/low-stock")
    public ResponseEntity<List<StatsResponse.LowStockBook>> getLowStock(
            @RequestParam(defaultValue = "50") int threshold) {
        return ResponseEntity.ok(adminStatsService.getLowStockBooks(threshold));
    }

    @GetMapping("/order-status")
    public ResponseEntity<List<StatsResponse.OrderStatusStat>> getOrderStatusStats() {
        return ResponseEntity.ok(adminStatsService.getOrderStatusStats());
    }
}