package com.bookish.bookish.dto.response;

import com.bookish.bookish.entity.Notification;
import lombok.*;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NotificationResponse {
    private Long id;
    private String type;
    private String title;
    private String message;
    private String link;
    private Boolean isRead;
    private LocalDateTime createdAt;

    public static NotificationResponse from(Notification n) {
        return NotificationResponse.builder()
                .id(n.getId())
                .type(n.getType())
                .title(n.getTitle())
                .message(n.getMessage())
                .link(n.getLink())
                .isRead(n.getIsRead())
                .createdAt(n.getCreatedAt())
                .build();
    }
}