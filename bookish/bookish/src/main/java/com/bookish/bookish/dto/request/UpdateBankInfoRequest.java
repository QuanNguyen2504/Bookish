package com.bookish.bookish.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class UpdateBankInfoRequest {

    @NotBlank(message = "Số tài khoản không được để trống")
    private String bankAccount;

    @NotBlank(message = "Tên ngân hàng không được để trống")
    private String bankName;

    @NotBlank(message = "Tên chủ tài khoản không được để trống")
    private String accountHolder;
}