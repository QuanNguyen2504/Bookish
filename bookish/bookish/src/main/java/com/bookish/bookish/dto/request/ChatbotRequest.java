package com.bookish.bookish.dto.request;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Getter;

import java.util.List;

@Getter
public class ChatbotRequest {

    private String message;

    /**
     * Lịch sử hội thoại do frontend lưu và gửi lên mỗi lần.
     * Mỗi phần tử: { "role": "user"/"assistant", "content": "..." }
     */
    private List<ConversationMessage> history;

    /**
     * FIX: Dùng @JsonProperty để Jackson đọc đúng field "isFirstMessage" từ JSON.
     * Nếu dùng @Getter của Lombok với "boolean isFirstMessage",
     * Lombok sinh getter là isIsFirstMessage() → Jackson không map được → luôn = false.
     *
     * TRUE  → tin nhắn đầu tiên: backend gửi full system prompt + danh sách sách.
     * FALSE → các tin nhắn tiếp theo: backend chỉ gửi history + message.
     */
    @JsonProperty("isFirstMessage")
    private boolean firstMessage;

    public boolean isFirstMessage() {
        return firstMessage;
    }

    @Getter
    public static class ConversationMessage {
        private String role;    // "user" hoặc "assistant"
        private String content;
    }
}