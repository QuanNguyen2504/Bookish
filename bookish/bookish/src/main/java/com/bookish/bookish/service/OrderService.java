package com.bookish.bookish.service;

import com.bookish.bookish.dto.request.CheckoutRequest;
import com.bookish.bookish.dto.request.UpdateOrderRequest;
import com.bookish.bookish.dto.response.*;
import com.bookish.bookish.entity.*;
import com.bookish.bookish.repository.*;
import com.bookish.bookish.exception.AppException;
import com.bookish.bookish.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class OrderService {

    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;
    private final CartItemRepository cartItemRepository;
    private final UserRepository userRepository;
    private final PromotionRepository promotionRepository;
    private final BookRepository bookRepository;
    private final OrderNotificationService orderNotificationService;
    private final PromotionService promotionService;
    private final NotificationService notificationService;

    private static final int QR_EXPIRY_MINUTES = 4;
    private static final BigDecimal SHIPPING_FEE = BigDecimal.valueOf(50000);

    @Transactional
    public OrderResponse checkout(Integer userId, CheckoutRequest req) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        List<CartItem> selectedItems = cartItemRepository
                .findAllByIdsAndUserId(req.getCartItemIds(), userId);

        if (selectedItems.isEmpty())
            throw new AppException(ErrorCode.ORDER_EMPTY_ITEMS);

        BigDecimal subtotal = selectedItems.stream()
                .map(item -> {
                    int sale = item.getBook().getSalePercent() == null ? 0 : item.getBook().getSalePercent();
                    BigDecimal finalPrice = item.getBook().getPrice()
                            .multiply(BigDecimal.ONE.subtract(
                                    BigDecimal.valueOf(sale).divide(BigDecimal.valueOf(100))));
                    return finalPrice.multiply(BigDecimal.valueOf(item.getQuantity()));
                })
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal shippingFee = SHIPPING_FEE;

        Order order = Order.builder()
                .user(user)
                .status("PENDING")
                .shippingAddress(req.getShippingAddress())
                .phone(req.getPhone())
                .paymentMethod(req.getPaymentMethod() != null ? req.getPaymentMethod() : "CASH")
                .subtotal(subtotal)
                .discountAmount(BigDecimal.ZERO)
                .shippingFee(shippingFee)
                .totalPrice(subtotal.add(shippingFee))
                .createdAt(LocalDateTime.now())
                .orderPromotions(new ArrayList<>())
                .build();
        orderRepository.save(order);

        BigDecimal totalDiscount = BigDecimal.ZERO;
        boolean hasFreeship = false;

        if (req.getPromotionIds() != null && !req.getPromotionIds().isEmpty()) {
            for (Integer promotionId : req.getPromotionIds()) {
                Promotion promotion = promotionRepository.findById(promotionId)
                        .orElseThrow(() -> new AppException(ErrorCode.PROMOTION_NOT_FOUND));

                BigDecimal discount = promotionService.applyOnOrder(
                        promotion.getPromotion_id(),
                        userId,
                        order.getOrderId(),
                        subtotal,
                        shippingFee
                );

                OrderPromotion op = OrderPromotion.builder()
                        .order(order)
                        .promotion(promotion)
                        .discountType(promotion.getDiscountType())
                        .discountAmount(discount)
                        .build();
                order.getOrderPromotions().add(op);

                if (promotion.getDiscountType() == DiscountType.FREESHIP) {
                    hasFreeship = true;
                } else {
                    totalDiscount = totalDiscount.add(discount);
                }
            }
        }

        totalDiscount = totalDiscount.min(subtotal);
        BigDecimal finalShipping = hasFreeship ? BigDecimal.ZERO : shippingFee;

        order.setDiscountAmount(totalDiscount);
        order.setShippingFee(finalShipping);
        order.setTotalPrice(subtotal.subtract(totalDiscount).add(finalShipping));
        orderRepository.save(order);

        final Order finalOrder = order;
        List<OrderItem> orderItems = selectedItems.stream().map(cartItem -> {
            int sale = cartItem.getBook().getSalePercent() == null ? 0 : cartItem.getBook().getSalePercent();
            BigDecimal finalPrice = cartItem.getBook().getPrice()
                    .multiply(BigDecimal.ONE.subtract(
                            BigDecimal.valueOf(sale).divide(BigDecimal.valueOf(100))));
            return OrderItem.builder()
                    .order(finalOrder)
                    .book(cartItem.getBook())
                    .quantity(cartItem.getQuantity())
                    .price(finalPrice)
                    .build();
        }).toList();
        orderItemRepository.saveAll(orderItems);
        orderNotificationService.notifyNewOrder(order, orderItems);

        // 🔔 Thông báo cho admin có đơn mới (lưu DB - không mất khi offline)
        try {
            notificationService.notifyAllAdmins(
                    "NEW_ORDER",
                    "Đơn hàng mới #" + order.getOrderId(),
                    "Khách " + user.getUsername() + " vừa đặt đơn "
                            + String.format("%,.0f", order.getTotalPrice()) + "đ",
                    "/admin/orders"
            );
        } catch (Exception ignored) {}

        if (!"QR_CODE".equals(order.getPaymentMethod())) {
            cartItemRepository.deleteAll(selectedItems);
        }

        return toResponse(order, orderItems);
    }

    @Transactional(readOnly = true)
    public List<OrderResponse> getOrdersByUser(Integer userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
        return orderRepository.findByUserOrderByCreatedAtDesc(user).stream()
                .map(o -> toResponse(o, orderItemRepository.findByOrder(o)))
                .toList();
    }

    @Transactional(readOnly = true)
    public OrderResponse getOrderById(Integer userId, Integer orderId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new AppException(ErrorCode.ORDER_NOT_FOUND));
        if (!order.getUser().getId().equals(userId))
            throw new AppException(ErrorCode.ORDER_ACCESS_DENIED);
        return toResponse(order, orderItemRepository.findByOrder(order));
    }

    @Transactional
    public OrderResponse cancelOrder(Integer userId, Integer orderId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new AppException(ErrorCode.ORDER_NOT_FOUND));
        if (!order.getUser().getId().equals(userId))
            throw new AppException(ErrorCode.ORDER_ACCESS_DENIED);
        if (!"PENDING".equals(order.getStatus()))
            throw new AppException(ErrorCode.ORDER_CANCEL_NOT_ALLOWED);

        if (order.getOrderPromotions() != null) {
            for (OrderPromotion op : order.getOrderPromotions()) {
                promotionService.refundOnCancel(op.getPromotion(), userId);
            }
        }

        order.setStatus("CANCELLED");
        orderRepository.save(order);
        return toResponse(order, orderItemRepository.findByOrder(order));
    }

    /**
     * Admin hủy đơn hàng — không cần kiểm tra userId
     * Cho phép hủy PENDING và PROCESSING (hoàn kho nếu đã trừ)
     */
    @Transactional
    public OrderResponse adminCancelOrder(Integer orderId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new AppException(ErrorCode.ORDER_NOT_FOUND));

        String status = order.getStatus();
        if ("CANCELLED".equals(status) || "DELIVERED".equals(status) || "SHIPPING".equals(status))
            throw new AppException(ErrorCode.ORDER_CANCEL_NOT_ALLOWED);

        // Nếu PROCESSING → đã trừ kho rồi → hoàn lại
        if ("PROCESSING".equals(status)) {
            List<OrderItem> items = orderItemRepository.findByOrder(order);
            restoreStock(items);
        }

        // Hoàn mã khuyến mãi
        if (order.getOrderPromotions() != null) {
            Integer userId = order.getUser().getId();
            for (OrderPromotion op : order.getOrderPromotions()) {
                promotionService.refundOnCancel(op.getPromotion(), userId);
            }
        }

        order.setStatus("CANCELLED");
        orderRepository.save(order);

        // 🔔 Thông báo cho user rằng đơn của họ đã bị admin hủy
        try {
            notificationService.createNotification(
                    order.getUser(),
                    "ORDER_CANCELLED_BY_ADMIN",
                    "Đơn hàng #" + order.getOrderId() + " đã bị hủy",
                    "Rất tiếc, đơn hàng của bạn đã bị hủy bởi cửa hàng. Vui lòng liên hệ để biết thêm chi tiết.",
                    "/orders/" + order.getOrderId()
            );
        } catch (Exception ignored) {}

        return toResponse(order, orderItemRepository.findByOrder(order));
    }

    @Transactional
    public OrderResponse confirmPayment(Integer orderId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new AppException(ErrorCode.ORDER_NOT_FOUND));
        if (!"PENDING".equals(order.getStatus()))
            throw new AppException(ErrorCode.ORDER_NOT_PENDING);
        if (!"QR_CODE".equals(order.getPaymentMethod()))
            throw new AppException(ErrorCode.ORDER_NOT_QR_PAYMENT);

        if (order.getCreatedAt().plusMinutes(QR_EXPIRY_MINUTES).isBefore(LocalDateTime.now())) {
            order.setStatus("CANCELLED");
            orderRepository.save(order);
            throw new AppException(ErrorCode.ORDER_PAYMENT_EXPIRED);
        }

        List<OrderItem> items = orderItemRepository.findByOrder(order);
        deductStock(items);

        Integer userId = order.getUser().getId();
        items.forEach(oi ->
                cartItemRepository.deleteByBookAndUserId(oi.getBook(), userId)
        );

        order.setStatus("PROCESSING");
        orderRepository.save(order);
        return toResponse(order, items);
    }

    @Transactional
    public OrderResponse confirmShipping(Integer orderId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new AppException(ErrorCode.ORDER_NOT_FOUND));
        if (!"PROCESSING".equals(order.getStatus()))
            throw new AppException(ErrorCode.ORDER_NOT_PROCESSING);

        order.setStatus("SHIPPING");
        orderRepository.save(order);

        // 🔔 Thông báo cho user: đơn đang được giao
        try {
            notificationService.createNotification(
                    order.getUser(),
                    "ORDER_SHIPPING",
                    "Đơn hàng #" + order.getOrderId() + " đang được giao",
                    "Đơn hàng của bạn đã được đơn vị vận chuyển nhận và đang trên đường giao tới.",
                    "/orders/" + order.getOrderId()
            );
        } catch (Exception ignored) {}

        return toResponse(order, orderItemRepository.findByOrder(order));
    }

    @Transactional
    public OrderResponse confirmDelivered(Integer userId, Integer orderId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new AppException(ErrorCode.ORDER_NOT_FOUND));
        if (!order.getUser().getId().equals(userId))
            throw new AppException(ErrorCode.ORDER_ACCESS_DENIED);
        if (!"SHIPPING".equals(order.getStatus()))
            throw new AppException(ErrorCode.ORDER_NOT_SHIPPING);
        order.setStatus("DELIVERED");
        orderRepository.save(order);
        return toResponse(order, orderItemRepository.findByOrder(order));
    }

    @Transactional
    public OrderResponse updateOrder(Integer userId, Integer orderId, UpdateOrderRequest req) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new AppException(ErrorCode.ORDER_NOT_FOUND));
        if (!order.getUser().getId().equals(userId))
            throw new AppException(ErrorCode.ORDER_ACCESS_DENIED);
        if (!"PENDING".equals(order.getStatus()))
            throw new AppException(ErrorCode.ORDER_ONLY_PENDING_UPDATE);
        if (req.getShippingAddress() != null) order.setShippingAddress(req.getShippingAddress());
        if (req.getPhone() != null) order.setPhone(req.getPhone());
        orderRepository.save(order);
        return toResponse(order, orderItemRepository.findByOrder(order));
    }

    // ============================================================
    // 🔥 BULK CONFIRM: PENDING CASH → PROCESSING + trừ kho
    // ============================================================

    public BulkConfirmResponse bulkConfirm(List<Integer> orderIds) {
        List<Order> candidates;

        if (orderIds == null || orderIds.isEmpty()) {
            candidates = orderRepository.findByStatusAndPaymentMethod("PENDING", "CASH");
        } else {
            candidates = orderRepository.findAllById(orderIds);
        }

        List<Integer> confirmedIds = new ArrayList<>();
        List<BulkConfirmResponse.FailedOrder> failed = new ArrayList<>();

        for (Order order : candidates) {
            if (!"PENDING".equals(order.getStatus())) {
                failed.add(BulkConfirmResponse.FailedOrder.builder()
                        .orderId(order.getOrderId())
                        .reason("Đơn hàng không ở trạng thái PENDING")
                        .build());
                continue;
            }
            if (!"CASH".equals(order.getPaymentMethod())) {
                failed.add(BulkConfirmResponse.FailedOrder.builder()
                        .orderId(order.getOrderId())
                        .reason("Chỉ hỗ trợ xác nhận hàng loạt cho đơn CASH")
                        .build());
                continue;
            }

            try {
                confirmSingleForBulk(order.getOrderId());
                confirmedIds.add(order.getOrderId());
            } catch (Exception e) {
                failed.add(BulkConfirmResponse.FailedOrder.builder()
                        .orderId(order.getOrderId())
                        .reason(e.getMessage())
                        .build());
            }
        }

        return BulkConfirmResponse.builder()
                .successCount(confirmedIds.size())
                .failedCount(failed.size())
                .confirmedOrderIds(confirmedIds)
                .failedOrders(failed)
                .build();
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void confirmSingleForBulk(Integer orderId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new AppException(ErrorCode.ORDER_NOT_FOUND));

        if (!"PENDING".equals(order.getStatus())) {
            throw new AppException(ErrorCode.ORDER_NOT_PENDING);
        }
        if (!"CASH".equals(order.getPaymentMethod())) {
            throw new AppException(ErrorCode.ORDER_BULK_CASH_ONLY);
        }

        List<OrderItem> items = orderItemRepository.findByOrder(order);
        deductStock(items);

        String oldStatus = order.getStatus();
        order.setStatus("PROCESSING");
        orderRepository.save(order);

        try {
            orderNotificationService.notifyOrderStatusChanged(order, oldStatus, "PROCESSING");
        } catch (Exception ignored) {}

        // 🔔 Thông báo cho user: đơn đã được xác nhận
        try {
            notificationService.createNotification(
                    order.getUser(),
                    "ORDER_CONFIRMED",
                    "Đơn hàng #" + order.getOrderId() + " đã được xác nhận",
                    "Cửa hàng đã xác nhận đơn hàng của bạn và đang chuẩn bị hàng để giao.",
                    "/orders/" + order.getOrderId()
            );
        } catch (Exception ignored) {}
    }

    // ============================================================
    // 🔥 BULK SHIP: PROCESSING → SHIPPING (không trừ kho, đã trừ rồi)
    // ============================================================

    public BulkConfirmResponse bulkShip(List<Integer> orderIds) {
        List<Order> candidates;

        if (orderIds == null || orderIds.isEmpty()) {
            candidates = orderRepository.findByStatus("PROCESSING");
        } else {
            candidates = orderRepository.findAllById(orderIds);
        }

        List<Integer> shippedIds = new ArrayList<>();
        List<BulkConfirmResponse.FailedOrder> failed = new ArrayList<>();

        for (Order order : candidates) {
            if (!"PROCESSING".equals(order.getStatus())) {
                failed.add(BulkConfirmResponse.FailedOrder.builder()
                        .orderId(order.getOrderId())
                        .reason("Đơn hàng không ở trạng thái PROCESSING")
                        .build());
                continue;
            }

            try {
                shipSingleForBulk(order.getOrderId());
                shippedIds.add(order.getOrderId());
            } catch (Exception e) {
                failed.add(BulkConfirmResponse.FailedOrder.builder()
                        .orderId(order.getOrderId())
                        .reason(e.getMessage())
                        .build());
            }
        }

        return BulkConfirmResponse.builder()
                .successCount(shippedIds.size())
                .failedCount(failed.size())
                .confirmedOrderIds(shippedIds)
                .failedOrders(failed)
                .build();
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void shipSingleForBulk(Integer orderId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new AppException(ErrorCode.ORDER_NOT_FOUND));

        if (!"PROCESSING".equals(order.getStatus())) {
            throw new AppException(ErrorCode.ORDER_NOT_PROCESSING);
        }

        String oldStatus = order.getStatus();
        order.setStatus("SHIPPING");
        orderRepository.save(order);

        try {
            orderNotificationService.notifyOrderStatusChanged(order, oldStatus, "SHIPPING");
        } catch (Exception ignored) {}

        // 🔔 Thông báo cho user: đang giao
        try {
            notificationService.createNotification(
                    order.getUser(),
                    "ORDER_SHIPPING",
                    "Đơn hàng #" + order.getOrderId() + " đang được giao",
                    "Đơn hàng của bạn đã được giao cho đơn vị vận chuyển.",
                    "/orders/" + order.getOrderId()
            );
        } catch (Exception ignored) {}
    }

    // ============================================================

    private void deductStock(List<OrderItem> items) {
        for (OrderItem item : items) {
            Book book = item.getBook();
            int newStock = book.getStock() - item.getQuantity();
            if (newStock < 0)
                throw new AppException(ErrorCode.BOOK_OUT_OF_STOCK);
            book.setStock(newStock);
            bookRepository.save(book);
        }
    }

    private void restoreStock(List<OrderItem> items) {
        for (OrderItem item : items) {
            Book book = item.getBook();
            book.setStock(book.getStock() + item.getQuantity());
            bookRepository.save(book);
        }
    }

    private OrderResponse toResponse(Order order, List<OrderItem> items) {
        List<OrderItemResponse> itemResponses = items.stream().map(oi ->
                OrderItemResponse.builder()
                        .orderItemId(oi.getOrderItemId())
                        .bookId(oi.getBook().getBook_id())
                        .title(oi.getBook().getTitle())
                        .image(oi.getBook().getImage())
                        .quantity(oi.getQuantity())
                        .price(oi.getPrice())
                        .subtotal(oi.getPrice().multiply(BigDecimal.valueOf(oi.getQuantity())))
                        .build()
        ).toList();

        List<AppliedPromotionResponse> promos = order.getOrderPromotions() == null
                ? List.of()
                : order.getOrderPromotions().stream()
                .map(op -> AppliedPromotionResponse.builder()
                        .promotionId(op.getPromotion().getPromotion_id())
                        .code(op.getPromotion().getCode())
                        .discountType(op.getDiscountType())
                        .discountAmount(op.getDiscountAmount())
                        .build())
                .toList();

        return OrderResponse.builder()
                .orderId(order.getOrderId())
                .status(order.getStatus())
                .shippingAddress(order.getShippingAddress())
                .phone(order.getPhone())
                .paymentMethod(order.getPaymentMethod())
                .subtotal(order.getSubtotal())
                .discountAmount(order.getDiscountAmount())
                .shippingFee(order.getShippingFee())
                .totalPrice(order.getTotalPrice())
                .createdAt(order.getCreatedAt())
                .items(itemResponses)
                .promotions(promos)
                .build();
    }



    public PageResponse<OrderResponse> getOrdersPaged(String status, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        Page<Order> orderPage;
        if (status != null && !status.isBlank()) {
            orderPage = orderRepository.findByStatusOrderByCreatedAtDesc(status, pageable);
        } else {
            orderPage = orderRepository.findAllPaged(pageable);
        }
        List<OrderResponse> content = orderPage.getContent().stream()
                .map(o -> toResponse(o, orderItemRepository.findByOrder(o)))
                .toList();
        return PageResponse.from(orderPage, content);
    }
}