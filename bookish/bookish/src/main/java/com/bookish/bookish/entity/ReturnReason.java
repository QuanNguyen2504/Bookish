package com.bookish.bookish.entity;

public enum ReturnReason {
    BROKEN,              // Sách hỏng/rách
    WRONG_BOOK,          // Gửi sai sách
    NOT_AS_DESCRIBED,    // Không đúng mô tả
    CHANGE_MIND,         // Đổi ý (user chịu phí ship)
    OTHER                // Khác
}