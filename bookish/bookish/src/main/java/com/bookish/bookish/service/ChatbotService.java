package com.bookish.bookish.service;

import com.bookish.bookish.entity.Book;
import com.bookish.bookish.entity.ChatbotLog;
import com.bookish.bookish.entity.User;
import com.bookish.bookish.repository.BookRepository;
import com.bookish.bookish.repository.ChatbotLogRepository;
import com.bookish.bookish.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class ChatbotService {

    private final BookRepository bookRepository;
    private final ChatbotLogRepository chatbotLogRepository;
    private final UserRepository userRepository;

    @Value("${groq.api.key}")
    private String groqApiKey;

    private static final String GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

    @SuppressWarnings("unchecked")
    public String chat(String message, Integer userId) {
        try {
            List<Book> books = bookRepository.findAll();
            String bookContext = books.stream()
                    .map(b -> b.getTitle() + " ("
                            + b.getAuthors().stream().findFirst().map(a -> a.getName()).orElse("?") + ", "
                            + String.format("%,.0f", b.getPrice().doubleValue()) + "đ, còn "
                            + (b.getStock() != null ? b.getStock() : 0) + " quyển)")
                    .collect(Collectors.joining("; "));

            String systemPrompt = "Bạn là trợ lý của nhà sách Bookish. "
                    + "Tư vấn sách và hỗ trợ khách hàng bằng tiếng Việt, ngắn gọn tối đa 150 từ. "
                    + "Sách hiện có: " + bookContext;

            Map<String, Object> systemMsg = Map.of("role", "system", "content", systemPrompt);
            Map<String, Object> userMsg = Map.of("role", "user", "content", message);
            Map<String, Object> requestBody = Map.of(
                    "model", "llama-3.1-8b-instant",
                    "messages", List.of(systemMsg, userMsg),
                    "temperature", 0.7,
                    "max_tokens", 512
            );

            RestTemplate restTemplate = new RestTemplate();
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setBearerAuth(groqApiKey);
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

            log.info("Calling Groq API...");
            ResponseEntity<Map> response = restTemplate.postForEntity(GROQ_URL, entity, Map.class);
            log.info("Groq response status: {}", response.getStatusCode());

            String reply = "Xin lỗi, tôi không thể trả lời lúc này.";
            if (response.getBody() != null) {
                try {
                    List<Map> choices = (List<Map>) response.getBody().get("choices");
                    Map<String, Object> choice = choices.get(0);
                    Map<String, Object> msg = (Map<String, Object>) choice.get("message");
                    reply = (String) msg.get("content");
                } catch (Exception e) {
                    log.error("Parse error: {}", e.getMessage());
                }
            }

            User user = userId != null ? userRepository.findById(userId).orElse(null) : null;
            chatbotLogRepository.save(ChatbotLog.builder()
                    .user(user).message(message).response(reply)
                    .createdAt(LocalDateTime.now()).build());

            return reply;

        } catch (Exception e) {
            log.error("Chatbot error: {}", e.getMessage(), e);
            return "Xin lỗi, tôi đang gặp sự cố. Vui lòng thử lại!";
        }
    }
}