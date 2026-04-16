package com.bookish.bookish.dto.request;

import lombok.*;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BulkConfirmRequest {

    /**
     * Danh sách orderId cần xác nhận.
     * Nếu null hoặc rỗng → tự động confirm TẤT CẢ đơn CASH PENDING.
     */
    private List<Integer> orderIds;
}