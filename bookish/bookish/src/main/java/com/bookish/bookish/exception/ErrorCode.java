package com.bookish.bookish.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;

@Getter
public enum ErrorCode {

    // COMMON
    UNCATEGORIZED_EXCEPTION(500, "Lỗi không xác định", HttpStatus.INTERNAL_SERVER_ERROR),
    INVALID_KEY(400, "Khóa không hợp lệ", HttpStatus.BAD_REQUEST),

    // AUTH
    // AUTH
    UNAUTHENTICATED(401, "Chưa xác thực", HttpStatus.UNAUTHORIZED),
    INVALID_PASSWORD(401, "Sai mật khẩu", HttpStatus.UNAUTHORIZED),
    UNAUTHORIZED(403, "Không có quyền truy cập", HttpStatus.FORBIDDEN),
    INVALID_LOGIN(401, "Username hoặc mật khẩu không đúng", HttpStatus.UNAUTHORIZED),
    INVALID_VERIFICATION_CODE(400, "Mã xác thực không đúng", HttpStatus.BAD_REQUEST),
    VERIFICATION_CODE_EXPIRED(400, "Mã xác thực đã hết hạn", HttpStatus.BAD_REQUEST),
    INVALID_RESET_CODE(400, "Mã đặt lại mật khẩu không đúng hoặc đã hết hạn", HttpStatus.BAD_REQUEST),

    // USER
    USER_NOT_FOUND(404, "Không tìm thấy người dùng", HttpStatus.NOT_FOUND),
    USERNAME_EXISTED(409, "Username đã tồn tại", HttpStatus.CONFLICT),
    EMAIL_EXISTED(409, "Email đã tồn tại", HttpStatus.CONFLICT),
    INVALID_FILE_TYPE(400, "Chỉ chấp nhận file ảnh (jpg, png, webp, gif)", HttpStatus.BAD_REQUEST),

    // BOOK
    BOOK_NOT_FOUND(404, "Không tìm thấy sách", HttpStatus.NOT_FOUND),
    BOOK_EXISTED(409, "Sách đã tồn tại", HttpStatus.CONFLICT),

    // AUTHOR
    AUTHOR_NOT_FOUND(404, "Không tìm thấy tác giả", HttpStatus.NOT_FOUND),
    AUTHOR_ALREADY_EXISTS(409, "Tác giả với tên này đã tồn tại", HttpStatus.CONFLICT),
    AUTHOR_HAS_BOOKS(409, "Không thể xóa tác giả vì vẫn còn sách liên kết", HttpStatus.CONFLICT),

    //CATEGORY
    CATEGORY_NOT_FOUND(404, "Không tìm thấy thể loại", HttpStatus.NOT_FOUND),
    CATEGORY_HAS_BOOK(409, "Không thể xóa thể loại vì còn sách", HttpStatus.CONFLICT),
    CATEGORY_ALREADY_EXISTS(409, "Danh mục với tên này đã tồn tại", HttpStatus.CONFLICT),

    //EMAIL
    EMAIL_NOT_VERIFIED(403, "Email chưa được xác thực. Vui lòng kiểm tra hộp thư", HttpStatus.FORBIDDEN),
    INVALID_VERIFICATION_TOKEN(400, "Mã xác thực không hợp lệ", HttpStatus.BAD_REQUEST),
    VERIFICATION_TOKEN_EXPIRED(400, "Mã xác thực đã hết hạn", HttpStatus.BAD_REQUEST),
    EMAIL_ALREADY_VERIFIED(409, "Email này đã được xác thực", HttpStatus.CONFLICT),
    EMAIL_SEND_FAILED(500, "Không gửi được email xác thực, vui lòng thử lại", HttpStatus.INTERNAL_SERVER_ERROR),

    //WISHLIST
    WISHLIST_ITEM_EXISTED(409, "Sách này đã có trong danh sách yêu thích", HttpStatus.CONFLICT),
    WISHLIST_ITEM_NOT_FOUND(404, "Không tìm thấy sách trong danh sách yêu thích", HttpStatus.NOT_FOUND),


    PROMOTION_NOT_FOUND(404, "Không tìm thấy khuyến mãi", HttpStatus.NOT_FOUND),
    PROMOTION_CODE_EXISTED(409, "Mã khuyến mãi đã tồn tại", HttpStatus.CONFLICT),
    INVALID_PROMOTION_TIME(400, "Thời gian khuyến mãi không hợp lệ", HttpStatus.BAD_REQUEST),
    PROMOTION_EXPIRED(400, "Khuyến mãi đã hết hạn", HttpStatus.BAD_REQUEST),
    PROMOTION_OUT_OF_USAGE(400, "Khuyến mãi đã hết lượt sử dụng", HttpStatus.BAD_REQUEST),
    PROMOTION_INACTIVE(400, "Khuyến mãi không hoạt động", HttpStatus.BAD_REQUEST),
    PROMOTION_NOT_STARTED(400, "Mã khuyến mãi chưa đến ngày áp dụng", HttpStatus.BAD_REQUEST),
    PROMOTION_MIN_ORDER_NOT_MET(400, "Đơn hàng chưa đạt giá trị tối thiểu để áp dụng mã", HttpStatus.BAD_REQUEST),
    PROMOTION_ALREADY_USED(400, "Bạn đã sử dụng mã khuyến mãi này rồi", HttpStatus.BAD_REQUEST),
    PROMOTION_TYPE_CONFLICT(400, "Chỉ được áp dụng 1 mã cho mỗi loại khuyến mãi", HttpStatus.BAD_REQUEST),

    // ORDER
    ORDER_NOT_FOUND(404, "Không tìm thấy đơn hàng", HttpStatus.NOT_FOUND);



    private final int code;
    private final String message;
    private final HttpStatusCode statusCode;

    ErrorCode(int code, String message, HttpStatusCode statusCode) {
        this.code = code;
        this.message = message;
        this.statusCode = statusCode;
    }
}