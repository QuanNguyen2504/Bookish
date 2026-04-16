package com.bookish.bookish.dto.response;

import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;
import java.util.List;

public class StatsResponse {

    @Getter @Builder
    public static class Summary {
        private BigDecimal totalRevenue;
        private long totalOrders;
        private BigDecimal avgOrderValue;
        private double completionRate;
        private long totalBooks;
        private long totalUsers;
        private long pendingOrders;
        private long processingOrders;
        private long deliveredOrders;
        private long cancelledOrders;
    }

    @Getter @Builder
    public static class MonthlyRevenue {
        private String month;
        private BigDecimal revenue;
        private long orders;
    }

    @Getter @Builder
    public static class DailyOrders {
        private String date;
        private long orders;
    }

    @Getter @Builder
    public static class TopBook {
        private Integer bookId;
        private String title;
        private String image;
        private String authorName;
        private long soldCount;
        private BigDecimal revenue;
    }

    @Getter @Builder
    public static class CategoryStat {
        private String name;
        private long bookCount;
    }

    @Getter @Builder
    public static class LowStockBook {
        private Integer bookId;
        private String title;
        private String image;
        private String authorName;
        private int stock;
    }

    @Getter @Builder
    public static class OrderStatusStat {
        private String name;
        private long value;
    }
}