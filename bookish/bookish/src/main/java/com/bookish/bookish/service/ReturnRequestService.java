package com.bookish.bookish.service;

import com.bookish.bookish.dto.request.AdminReturnActionRequest;
import com.bookish.bookish.dto.request.CreateReturnRequest;
import com.bookish.bookish.dto.request.UpdateBankInfoRequest;
import com.bookish.bookish.dto.response.PageResponse;
import com.bookish.bookish.dto.response.ReturnRequestResponse;
import com.bookish.bookish.entity.*;
import com.bookish.bookish.exception.AppException;
import com.bookish.bookish.exception.ErrorCode;
import com.bookish.bookish.repository.BookRepository;
import com.bookish.bookish.repository.OrderItemRepository;
import com.bookish.bookish.repository.OrderRepository;
import com.bookish.bookish.repository.ReturnRequestRepository;
import com.bookish.bookish.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ReturnRequestService {

    private final ReturnRequestRepository returnRepo;
    private final OrderRepository orderRepo;
    private final OrderItemRepository orderItemRepo;
    private final UserRepository userRepo;
    private final BookRepository bookRepo;
    private final NotificationService notificationService;

    private static final int RETURN_WINDOW_DAYS = 7;

    // ========================================================
    // USER APIs
    // ========================================================

    /** User gửi yêu cầu hoàn trả */
    @Transactional
    public ReturnRequestResponse createRequest(Integer userId, CreateReturnRequest req) {
        User user = userRepo.findById(userId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
        Order order = orderRepo.findById(req.getOrderId())
                .orElseThrow(() -> new AppException(ErrorCode.ORDER_NOT_FOUND));

        if (!order.getUser().getId().equals(userId))
            throw new AppException(ErrorCode.ORDER_ACCESS_DENIED);

        if (!"DELIVERED".equals(order.getStatus()))
            throw new AppException(ErrorCode.RETURN_ORDER_NOT_DELIVERED);

        // Quá 7 ngày từ khi đơn DELIVERED thì không cho hoàn
        // Dùng updatedAt hoặc createdAt — ở đây dùng createdAt của đơn
        // (đồ án không lưu deliveredAt riêng, có thể cải tiến sau)
        if (order.getCreatedAt().plusDays(RETURN_WINDOW_DAYS).isBefore(LocalDateTime.now()))
            throw new AppException(ErrorCode.RETURN_WINDOW_EXPIRED);

        if (returnRepo.existsByOrder(order))
            throw new AppException(ErrorCode.RETURN_ALREADY_EXISTS);

        // Tính số tiền hoàn: nếu CHANGE_MIND → trừ shipping fee
        BigDecimal refund = order.getTotalPrice();
        if (req.getReason() == ReturnReason.CHANGE_MIND && order.getShippingFee() != null) {
            refund = refund.subtract(order.getShippingFee()).max(BigDecimal.ZERO);
        }

        ReturnRequest r = ReturnRequest.builder()
                .order(order)
                .user(user)
                .reason(req.getReason())
                .description(req.getDescription())
                .imageUrl(req.getImageUrl())
                .status("REQUESTED")
                .refundAmount(refund)
                .build();

        ReturnRequest saved = returnRepo.save(r);

        // 🔔 Thông báo cho admin có yêu cầu hoàn trả mới
        try {
            notificationService.notifyAllAdmins(
                    "NEW_RETURN",
                    "Yêu cầu hoàn trả mới",
                    "Khách " + user.getUsername() + " yêu cầu hoàn trả đơn #" + order.getOrderId(),
                    "/admin/returns"
            );
        } catch (Exception ignored) {}

        return toResponse(saved);
    }

    /** User xem các yêu cầu của mình */
    @Transactional(readOnly = true)
    public List<ReturnRequestResponse> getMyRequests(Integer userId) {
        User user = userRepo.findById(userId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
        return returnRepo.findByUserOrderByCreatedAtDesc(user).stream()
                .map(this::toResponse).toList();
    }

    /** User cập nhật thông tin ngân hàng (sau khi admin APPROVED hoặc RETURNED) */
    @Transactional
    public ReturnRequestResponse updateBankInfo(Integer userId, Integer returnId, UpdateBankInfoRequest req) {
        ReturnRequest r = returnRepo.findById(returnId)
                .orElseThrow(() -> new AppException(ErrorCode.RETURN_NOT_FOUND));
        if (!r.getUser().getId().equals(userId))
            throw new AppException(ErrorCode.RETURN_ACCESS_DENIED);
        if (!List.of("APPROVED", "RETURNED").contains(r.getStatus()))
            throw new AppException(ErrorCode.RETURN_INVALID_STATUS);

        r.setBankAccount(req.getBankAccount());
        r.setBankName(req.getBankName());
        r.setAccountHolder(req.getAccountHolder());
        return toResponse(returnRepo.save(r));
    }

    /** User hủy yêu cầu khi còn đang REQUESTED */
    @Transactional
    public ReturnRequestResponse cancelRequest(Integer userId, Integer returnId) {
        ReturnRequest r = returnRepo.findById(returnId)
                .orElseThrow(() -> new AppException(ErrorCode.RETURN_NOT_FOUND));
        if (!r.getUser().getId().equals(userId))
            throw new AppException(ErrorCode.RETURN_ACCESS_DENIED);
        if (!"REQUESTED".equals(r.getStatus()))
            throw new AppException(ErrorCode.RETURN_INVALID_STATUS);

        r.setStatus("CANCELLED_BY_USER");
        return toResponse(returnRepo.save(r));
    }

    // ========================================================
    // ADMIN APIs
    // ========================================================

    @Transactional(readOnly = true)
    public List<ReturnRequestResponse> getAllRequests() {
        return returnRepo.findAllByOrderByCreatedAtDesc().stream()
                .map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public ReturnRequestResponse getById(Integer returnId) {
        return toResponse(returnRepo.findById(returnId)
                .orElseThrow(() -> new AppException(ErrorCode.RETURN_NOT_FOUND)));
    }

    /** Admin duyệt: REQUESTED → APPROVED */
    @Transactional
    public ReturnRequestResponse approve(Integer returnId, AdminReturnActionRequest req) {
        ReturnRequest r = findRequestInStatus(returnId, "REQUESTED");
        r.setStatus("APPROVED");
        r.setAdminNote(req.getAdminNote());
        ReturnRequest saved = returnRepo.save(r);

        // 🔔 Thông báo cho user: yêu cầu được duyệt
        try {
            notificationService.createNotification(
                    saved.getUser(),
                    "RETURN_APPROVED",
                    "Yêu cầu hoàn trả được chấp nhận",
                    "Đơn hàng #" + saved.getOrder().getOrderId()
                            + " đã được duyệt hoàn trả. Vui lòng cập nhật thông tin ngân hàng để nhận tiền.",
                    "/orders/" + saved.getOrder().getOrderId()
            );
        } catch (Exception ignored) {}

        return toResponse(saved);
    }

    /** Admin từ chối: REQUESTED → REJECTED */
    @Transactional
    public ReturnRequestResponse reject(Integer returnId, AdminReturnActionRequest req) {
        ReturnRequest r = findRequestInStatus(returnId, "REQUESTED");
        r.setStatus("REJECTED");
        r.setAdminNote(req.getAdminNote());
        ReturnRequest saved = returnRepo.save(r);

        // 🔔 Thông báo cho user: bị từ chối
        try {
            String note = (req.getAdminNote() != null && !req.getAdminNote().isBlank())
                    ? req.getAdminNote() : "Không có lý do cụ thể";
            notificationService.createNotification(
                    saved.getUser(),
                    "RETURN_REJECTED",
                    "Yêu cầu hoàn trả bị từ chối",
                    "Đơn #" + saved.getOrder().getOrderId() + " - Lý do: " + note,
                    "/orders/" + saved.getOrder().getOrderId()
            );
        } catch (Exception ignored) {}

        return toResponse(saved);
    }

    /** Admin xác nhận đã nhận lại sách: APPROVED → RETURNED + hoàn kho */
    @Transactional
    public ReturnRequestResponse confirmReturned(Integer returnId) {
        ReturnRequest r = findRequestInStatus(returnId, "APPROVED");

        // Hoàn kho
        List<OrderItem> items = orderItemRepo.findByOrder(r.getOrder());
        for (OrderItem item : items) {
            Book book = item.getBook();
            book.setStock(book.getStock() + item.getQuantity());
            bookRepo.save(book);
        }

        r.setStatus("RETURNED");
        ReturnRequest saved = returnRepo.save(r);

        // 🔔 Thông báo cho user: đã nhận hàng trả, chờ hoàn tiền
        try {
            notificationService.createNotification(
                    saved.getUser(),
                    "RETURN_RECEIVED",
                    "Đã nhận hàng hoàn trả",
                    "Cửa hàng đã nhận được hàng hoàn trả của bạn. Tiền sẽ được chuyển vào tài khoản trong thời gian sớm nhất.",
                    "/orders/" + saved.getOrder().getOrderId()
            );
        } catch (Exception ignored) {}

        return toResponse(saved);
    }

    /** Admin đánh dấu đã chuyển tiền: RETURNED → REFUNDED */
    @Transactional
    public ReturnRequestResponse markRefunded(Integer returnId, AdminReturnActionRequest req) {
        ReturnRequest r = findRequestInStatus(returnId, "RETURNED");

        // Kiểm tra có thông tin ngân hàng chưa
        if (r.getBankAccount() == null || r.getBankAccount().isBlank()
                || r.getBankName() == null || r.getBankName().isBlank()
                || r.getAccountHolder() == null || r.getAccountHolder().isBlank()) {
            throw new AppException(ErrorCode.RETURN_BANK_INFO_REQUIRED);
        }

        r.setStatus("REFUNDED");
        if (req != null && req.getAdminNote() != null) {
            r.setAdminNote(req.getAdminNote());
        }
        ReturnRequest saved = returnRepo.save(r);

        // 🔔 Thông báo cho user: đã hoàn tiền
        try {
            notificationService.createNotification(
                    saved.getUser(),
                    "RETURN_REFUNDED",
                    "Đã hoàn tiền cho đơn #" + saved.getOrder().getOrderId(),
                    "Số tiền " + String.format("%,.0f", saved.getRefundAmount())
                            + "đ đã được chuyển vào tài khoản " + saved.getBankAccount() + " (" + saved.getBankName() + ").",
                    "/orders/" + saved.getOrder().getOrderId()
            );
        } catch (Exception ignored) {}

        return toResponse(saved);
    }



    private ReturnRequest findRequestInStatus(Integer returnId, String expectedStatus) {
        ReturnRequest r = returnRepo.findById(returnId)
                .orElseThrow(() -> new AppException(ErrorCode.RETURN_NOT_FOUND));
        if (!expectedStatus.equals(r.getStatus()))
            throw new AppException(ErrorCode.RETURN_INVALID_STATUS);
        return r;
    }

    private ReturnRequestResponse toResponse(ReturnRequest r) {
        return ReturnRequestResponse.builder()
                .returnId(r.getReturnId())
                .orderId(r.getOrder().getOrderId())
                .userId(r.getUser().getId())
                .username(r.getUser().getUsername())
                .userEmail(r.getUser().getEmail())
                .reason(r.getReason())
                .description(r.getDescription())
                .imageUrl(r.getImageUrl())
                .status(r.getStatus())
                .adminNote(r.getAdminNote())
                .bankAccount(r.getBankAccount())
                .bankName(r.getBankName())
                .accountHolder(r.getAccountHolder())
                .refundAmount(r.getRefundAmount())
                .orderTotal(r.getOrder().getTotalPrice())
                .orderPaymentMethod(r.getOrder().getPaymentMethod())
                .orderDeliveredAt(r.getOrder().getCreatedAt())
                .createdAt(r.getCreatedAt())
                .updatedAt(r.getUpdatedAt())
                .build();
    }

    public PageResponse<ReturnRequestResponse> getAllRequestsPaged(String status, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        Page<ReturnRequest> returnPage = returnRepo.findAllPaged(status, pageable);
        List<ReturnRequestResponse> content = returnPage.getContent().stream()
                .map(this::toResponse).toList();
        return PageResponse.from(returnPage, content);
    }
}