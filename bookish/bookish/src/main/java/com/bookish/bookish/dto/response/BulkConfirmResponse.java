package com.bookish.bookish.dto.response;

import lombok.*;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BulkConfirmResponse {

    private int successCount;
    private int failedCount;
    private List<Integer> confirmedOrderIds;
    private List<FailedOrder> failedOrders;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class FailedOrder {
        private Integer orderId;
        private String reason;
    }
}