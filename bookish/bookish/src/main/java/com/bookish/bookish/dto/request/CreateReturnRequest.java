package com.bookish.bookish.dto.request;

import com.bookish.bookish.entity.ReturnReason;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class CreateReturnRequest {

    @NotNull(message = "orderId không được để trống")
    private Integer orderId;

    @NotNull(message = "Lý do không được để trống")
    private ReturnReason reason;

    private String description;

    // URL ảnh đã upload qua /upload/image trước đó
    private String imageUrl;
}