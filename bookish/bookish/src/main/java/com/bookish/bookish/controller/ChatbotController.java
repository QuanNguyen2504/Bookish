package com.bookish.bookish.controller;

import com.bookish.bookish.dto.request.ChatbotRequest;
import com.bookish.bookish.dto.response.ChatbotResponse;
import com.bookish.bookish.security.JwtUtil;
import com.bookish.bookish.service.ChatbotService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/chatbot")
@RequiredArgsConstructor
public class ChatbotController {

    private final ChatbotService chatbotService;
    private final JwtUtil jwtUtil;

    @PostMapping
    public ResponseEntity<ChatbotResponse> chat(
            @RequestBody ChatbotRequest req,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        try {
            // Lấy userId nếu đã đăng nhập (không bắt buộc)
            Integer userId = null;
            if (authHeader != null && authHeader.startsWith("Bearer ")) {
                try {
                    userId = jwtUtil.extractUserId(authHeader.replace("Bearer ", ""));
                } catch (Exception ignored) {}
            }
            String reply = chatbotService.chat(req.getMessage(), userId);
            return ResponseEntity.ok(new ChatbotResponse(reply));
        } catch (Exception e) {
            return ResponseEntity.ok(new ChatbotResponse("Xin lỗi, tôi đang gặp sự cố. Vui lòng thử lại sau!"));
        }
    }
}
