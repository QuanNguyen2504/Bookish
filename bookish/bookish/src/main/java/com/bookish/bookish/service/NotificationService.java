package com.bookish.bookish.service;

import com.bookish.bookish.dto.response.NotificationResponse;
import com.bookish.bookish.entity.Notification;
import com.bookish.bookish.entity.Role;
import com.bookish.bookish.entity.User;
import com.bookish.bookish.exception.AppException;
import com.bookish.bookish.exception.ErrorCode;
import com.bookish.bookish.repository.NotificationRepository;
import com.bookish.bookish.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;

    /** Tạo thông báo cho 1 user cụ thể */
    @Transactional
    public void createNotification(User user, String type, String title, String message, String link) {
        try {
            Notification n = Notification.builder()
                    .user(user)
                    .type(type)
                    .title(title)
                    .message(message)
                    .link(link)
                    .isRead(false)
                    .build();
            notificationRepository.save(n);
        } catch (Exception e) {
            log.error("Failed to create notification for user {}: {}", user.getId(), e.getMessage());
        }
    }

    /** Tạo thông báo cho TẤT CẢ admin + staff */
    @Transactional
    public void notifyAllAdmins(String type, String title, String message, String link) {
        List<User> admins = userRepository.findByRole(Role.ADMIN);
        List<User> staffs = userRepository.findByRole(Role.STAFF);
        admins.forEach(a -> createNotification(a, type, title, message, link));
        staffs.forEach(s -> createNotification(s, type, title, message, link));
    }

    /** Lấy danh sách thông báo của user đang đăng nhập */
    public List<NotificationResponse> getMyNotifications() {
        User user = getCurrentUser();
        return notificationRepository.findByUserOrderByCreatedAtDesc(user)
                .stream()
                .map(NotificationResponse::from)
                .toList();
    }

    /** Đếm số thông báo chưa đọc */
    public Map<String, Long> getUnreadCount() {
        User user = getCurrentUser();
        long count = notificationRepository.countByUserAndIsReadFalse(user);
        return Map.of("unreadCount", count);
    }

    /** Đánh dấu 1 thông báo là đã đọc */
    @Transactional
    public void markAsRead(Long notificationId) {
        User user = getCurrentUser();
        Notification n = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new AppException(ErrorCode.NOTIFICATION_NOT_FOUND));
        if (!n.getUser().getId().equals(user.getId())) {
            throw new AppException(ErrorCode.NOTIFICATION_ACCESS_DENIED);
        }
        n.setIsRead(true);
        notificationRepository.save(n);
    }

    /** Đánh dấu tất cả là đã đọc */
    @Transactional
    public Map<String, Integer> markAllAsRead() {
        User user = getCurrentUser();
        int updated = notificationRepository.markAllAsRead(user);
        return Map.of("updated", updated);
    }

    private User getCurrentUser() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
    }
}
