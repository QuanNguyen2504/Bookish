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
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicReference;
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
    private static final String MODEL    = "llama-3.1-8b-instant";

    // ─── 11 Intent ──────────────────────────────────────────────────────────────
    private enum Intent {
        GREETING,        // Chào hỏi, cảm ơn, tạm biệt
        BOOK_SEARCH,     // Tìm sách theo tên, tác giả, thể loại, giá
        BOOK_INFO,       // Chi tiết sách: giá, tồn kho, nội dung, tác giả
        BOOK_RECOMMEND,  // Gợi ý, tư vấn sách phù hợp
        ACCOUNT,         // Đăng ký, đăng nhập, quên mật khẩu
        ORDER,           // Giỏ hàng, đặt hàng, hủy đơn
        PAYMENT,         // Thanh toán, phương thức, lỗi
        SHIPPING,        // Vận chuyển, phí ship, theo dõi đơn
        PROMOTION,       // Mã giảm giá, voucher, khuyến mãi
        RETURN_SUPPORT,  // Đổi trả, hoàn tiền, hỗ trợ sau mua
        WEBSITE_INFO,    // Thông tin chung website
        FALLBACK         // Ngoài phạm vi
    }

    // ─── FAQ cố định — không cần gọi DB ─────────────────────────────────────────
    private static final String BOOKISH_FAQ = """
            Thông tin nhà sách Bookish:
            - Thanh toán: QR chuyển khoản MB Bank, COD (thanh toán khi nhận hàng).
            - Vận chuyển: giao toàn quốc, phí ship tính theo khoảng cách địa chỉ giao hàng.
            - Thời gian giao hàng: 2-5 ngày làm việc tuỳ khu vực.
            - Đổi trả: trong 2 ngày nếu sách bị lỗi hoặc sai sản phẩm.
            - Hoàn tiền: xử lý trong 3-5 ngày làm việc sau khi xác nhận.
            - Đăng ký: vào trang đăng ký, điền thông tin và xác nhận email.
            - Quên mật khẩu: trang đăng nhập → "Quên mật khẩu" → nhập email nhận link đặt lại.
            - Lịch sử mua hàng: tài khoản → "Đơn hàng của tôi".
            - Nhập mã giảm giá: tại trang thanh toán (checkout).
            - Hỗ trợ: liên hệ qua chatbot 24/7 hoặc email hỗ trợ.
            - Không có app di động, chỉ có website.
            """;

    // ─── Cache sách ─────────────────────────────────────────────────────────────
    // null = chưa load lần nào, "" = đã load nhưng không có sách
    private final AtomicReference<String> cachedBookContext = new AtomicReference<>(null);

    private String getBookContext() {
        String ctx = cachedBookContext.get();
        if (ctx == null) {
            refreshBookCache();
            ctx = cachedBookContext.get();
        }
        return ctx == null ? "" : ctx;
    }

    /**
     * FIX: @Transactional để Hibernate giữ session khi đọc lazy collections
     * (authors, categories). Dùng findAllActiveWithDetails() với JOIN FETCH
     * để load tất cả sách chưa bị xóa kèm đầy đủ thông tin trong 1 query.
     *
     * CẢI TIẾN so với code cũ:
     * - Thêm description (tóm tắt nội dung) vào cache
     * - Thêm categories vào cache
     * - Tính giá sau giảm để chatbot trả lời đúng giá thực
     */
    @Transactional(readOnly = true)
    @Scheduled(fixedRate = 600_000)
    public void refreshBookCache() {
        try {
            List<Book> books = bookRepository.findAllActiveWithDetails();
            if (books.isEmpty()) {
                cachedBookContext.set("");
                log.info("Book cache: no books found in DB");
                return;
            }

            String context = books.stream()
                    .map(b -> {
                        // Tác giả
                        String authors;
                        try {
                            authors = (b.getAuthors() == null || b.getAuthors().isEmpty())
                                    ? "Chưa có tác giả"
                                    : b.getAuthors().stream()
                                    .map(a -> a.getName())
                                    .collect(Collectors.joining(", "));
                        } catch (Exception e) {
                            authors = "Chưa có tác giả";
                        }

                        // Thể loại — CẢI TIẾN: thêm mới so với code cũ
                        String categories;
                        try {
                            categories = (b.getCategories() == null || b.getCategories().isEmpty())
                                    ? "Chưa phân loại"
                                    : b.getCategories().stream()
                                    .map(c -> c.getName())
                                    .collect(Collectors.joining(", "));
                        } catch (Exception e) {
                            categories = "Chưa phân loại";
                        }

                        // Giá & khuyến mãi — CẢI TIẾN: tính giá sau giảm
                        String priceStr;
                        if (b.getSalePercent() != null && b.getSalePercent() > 0) {
                            double salePrice = b.getPrice().doubleValue()
                                    * (1 - b.getSalePercent() / 100.0);
                            priceStr = String.format("%,.0fđ (giảm %d%%, gốc %,.0fđ)",
                                    salePrice, b.getSalePercent(), b.getPrice().doubleValue());
                        } else {
                            priceStr = String.format("%,.0fđ", b.getPrice().doubleValue());
                        }

                        // Tồn kho
                        int stock = b.getStock() != null ? b.getStock() : 0;
                        String stockStatus = stock > 0 ? "còn " + stock + " quyển" : "hết hàng";

                        // Mô tả — CẢI TIẾN: thêm mới so với code cũ, cắt ngắn 150 ký tự
                        String desc = "Chưa có mô tả";
                        if (b.getDescription() != null && !b.getDescription().isBlank()) {
                            desc = b.getDescription().length() > 300
                                    ? b.getDescription().substring(0, 300) + "..."
                                    : b.getDescription();
                        }

                        return "- \"" + b.getTitle() + "\""
                                + " | Tác giả: " + authors
                                + " | Thể loại: " + categories
                                + " | Giá: " + priceStr
                                + " | " + stockStatus
                                + " | Nội dung: " + desc;
                    })
                    .collect(Collectors.joining("\n"));

            cachedBookContext.set(context);
            log.info("Refreshed chatbot book cache: {} books", books.size());
        } catch (Exception e) {
            log.error("Failed to refresh book cache: {}", e.getMessage());
            // Giữ cache cũ nếu có lỗi
        }
    }

    // ─── DEBUG ──────────────────────────────────────────────────────────────────
    public String getCacheStatus() {
        String ctx = cachedBookContext.get();
        if (ctx == null) return "CACHE = null (chưa load lần nào)";
        if (ctx.isBlank()) return "CACHE = rỗng (không có sách nào trong DB hoặc tất cả deleted=true)";
        return "CACHE OK - " + ctx.lines().count() + " sách:\n" + ctx;
    }

    // ─── ENTRY POINT CHÍNH ──────────────────────────────────────────────────────
    @SuppressWarnings("unchecked")
    public String chat(String message,
                       List<Map<String, String>> history,
                       boolean isFirstMessage,
                       Integer userId) {
        try {
            String reply;

            if (isFirstMessage) {
                // ── Tin nhắn ĐẦU TIÊN: phân loại intent trước ──────────────────
                Intent intent = detectIntent(message);
                log.info("First message | Intent: {}", intent);

                reply = switch (intent) {
                    case GREETING -> handleGreeting(message);

                    case BOOK_SEARCH,
                         BOOK_INFO,
                         BOOK_RECOMMEND -> handleBookQueryFirst(message, intent, history);

                    case ACCOUNT        -> handleFaq(message, history, "tài khoản, đăng ký, đăng nhập, mật khẩu");
                    case ORDER          -> handleFaq(message, history, "giỏ hàng, đặt hàng, hủy đơn, lịch sử mua hàng");
                    case PAYMENT        -> handleFaq(message, history, "thanh toán, phương thức thanh toán, lỗi thanh toán");
                    case SHIPPING       -> handleFaq(message, history, "vận chuyển, phí ship, thời gian giao hàng, theo dõi đơn");
                    case PROMOTION      -> handleFaq(message, history, "khuyến mãi, mã giảm giá, voucher");
                    case RETURN_SUPPORT -> handleFaq(message, history, "đổi trả, hoàn tiền, hỗ trợ sau mua");
                    case WEBSITE_INFO   -> handleFaq(message, history, "thông tin website, chính sách Bookish");
                    case FALLBACK       -> handleFallback();
                };

            } else {
                // ── Tin nhắn TIẾP THEO: giữ nguyên kiến trúc cũ dùng history ──
                // AI đã biết toàn bộ sách từ lần đầu → không cần gửi lại
                reply = handleContinueConversation(message, history);
            }

            saveChatLog(userId, message, reply);
            return reply;

        } catch (Exception e) {
            log.error("Chatbot error: {}", e.getMessage(), e);
            return "Xin lỗi, tôi đang gặp sự cố. Vui lòng thử lại!";
        }
    }

    // ─── Bước 1: Phân loại intent (chỉ gọi khi isFirstMessage = true) ───────────
    private Intent detectIntent(String message) {
        // Bước 1a: Keyword matching — nhanh, không tốn token, bắt các câu đơn giản
        Intent quick = quickMatch(message);
        if (quick != null) {
            log.info("Intent from keyword match: {}", quick);
            return quick;
        }

        // Bước 1b: Gọi Groq để phân loại các câu phức tạp hơn
        try {
            String systemPrompt = """
                    Phân loại câu hỏi của khách hàng nhà sách vào đúng 1 nhãn.
                    Chỉ trả về đúng 1 từ trong danh sách, không giải thích thêm:
                    - GREETING        : chào hỏi, cảm ơn, tạm biệt
                    - BOOK_SEARCH     : tìm sách theo tên, tác giả, thể loại, giá
                    - BOOK_INFO       : hỏi chi tiết sách: giá, tồn kho, nội dung, tác giả
                    - BOOK_RECOMMEND  : nhờ gợi ý, tư vấn sách phù hợp
                    - ACCOUNT         : đăng ký, đăng nhập, quên mật khẩu, thông tin cá nhân
                    - ORDER           : giỏ hàng, đặt hàng, hủy đơn, lịch sử mua hàng
                    - PAYMENT         : thanh toán, phương thức, lỗi thanh toán, tiền bị trừ
                    - SHIPPING        : vận chuyển, phí ship, thời gian giao, theo dõi đơn
                    - PROMOTION       : mã giảm giá, voucher, khuyến mãi
                    - RETURN_SUPPORT  : đổi trả, hoàn tiền, sách bị lỗi, liên hệ hỗ trợ
                    - WEBSITE_INFO    : thông tin website, chính sách, Bookish là gì
                    - FALLBACK        : không liên quan hoặc không hiểu
                    """;

            String raw = callGroq(systemPrompt, message, null, 20);
            log.info("Groq raw intent response: '{}'", raw);

            // Tìm nhãn hợp lệ trong chuỗi trả về (không yêu cầu khớp chính xác)
            String upper = raw.toUpperCase();
            if (upper.contains("GREETING"))        return Intent.GREETING;
            if (upper.contains("BOOK_RECOMMEND"))  return Intent.BOOK_RECOMMEND;
            if (upper.contains("BOOK_SEARCH"))      return Intent.BOOK_SEARCH;
            if (upper.contains("BOOK_INFO"))        return Intent.BOOK_INFO;
            if (upper.contains("RETURN_SUPPORT"))   return Intent.RETURN_SUPPORT;
            if (upper.contains("ACCOUNT"))          return Intent.ACCOUNT;
            if (upper.contains("ORDER"))            return Intent.ORDER;
            if (upper.contains("PAYMENT"))          return Intent.PAYMENT;
            if (upper.contains("SHIPPING"))         return Intent.SHIPPING;
            if (upper.contains("PROMOTION"))        return Intent.PROMOTION;
            if (upper.contains("WEBSITE_INFO"))     return Intent.WEBSITE_INFO;
            if (upper.contains("FALLBACK"))         return Intent.FALLBACK;

            return Intent.FALLBACK;

        } catch (Exception e) {
            log.warn("Intent detection failed, fallback BOOK_SEARCH: {}", e.getMessage());
            return Intent.BOOK_SEARCH;
        }
    }

    /**
     * Keyword matching nhanh cho các câu đơn giản — không gọi Groq.
     * Trả về null nếu không khớp → tiếp tục gọi Groq.
     */
    private Intent quickMatch(String message) {
        String m = message.toLowerCase().trim();

        // GREETING
        if (m.matches(".*(xin chào|chào|hello|hi|hey|chao|good morning|good afternoon"
                + "|cảm ơn|cam on|thank|cảm ơn|tạm biệt|tam biet|bye|tốt|ok bạn).*"))
            return Intent.GREETING;

        // FALLBACK rõ ràng
        if (m.matches("[?!.\\s]+") || m.length() < 3)
            return Intent.FALLBACK;
        if (m.matches(".*(thời tiết|weather|chuyện cười|joke|bạn là ai|bạn là gì|you are).*"))
            return Intent.FALLBACK;

        // SHIPPING
        if (m.matches(".*(phí ship|phí vận chuyển|giao hàng|ship|vận chuyển|theo dõi đơn"
                + "|bao lâu nhận|toàn quốc|kiểm tra hàng).*"))
            return Intent.SHIPPING;

        // PAYMENT
        if (m.matches(".*(thanh toán|payment|momo|vnpay|cod|tiền bị trừ|không thanh toán được).*"))
            return Intent.PAYMENT;

        // PROMOTION
        if (m.matches(".*(mã giảm giá|voucher|khuyến mãi|coupon|giảm giá|ưu đãi).*"))
            return Intent.PROMOTION;

        // ACCOUNT
        if (m.matches(".*(đăng ký|đăng nhập|quên mật khẩu|mật khẩu|tài khoản|login|register"
                + "|lịch sử mua|số điện thoại|thông tin cá nhân).*"))
            return Intent.ACCOUNT;

        // ORDER
        if (m.matches(".*(đặt hàng|giỏ hàng|hủy đơn|hủy đơn hàng|đơn hàng|cart|checkout"
                + "|mua hàng|thêm vào giỏ|xóa khỏi giỏ).*"))
            return Intent.ORDER;

        // RETURN_SUPPORT
        if (m.matches(".*(đổi trả|hoàn tiền|sách bị lỗi|hỗ trợ|liên hệ|refund|return).*"))
            return Intent.RETURN_SUPPORT;

        // WEBSITE_INFO
        if (m.matches(".*(bookish là|website|app|ứng dụng|chính sách|bảo mật|hoạt động mấy giờ).*"))
            return Intent.WEBSITE_INFO;

        return null; // Không khớp → gọi Groq
    }

    // ─── Chào hỏi: không kèm data sách, không kèm FAQ ───────────────────────────
    private String handleGreeting(String message) {
        String systemPrompt = """
                Bạn là Bookish Assistant - trợ lý thân thiện của nhà sách Bookish.
                Chào lại khách lịch sự, ngắn gọn (tối đa 2 câu),
                hỏi xem có thể giúp gì về sách hoặc đơn hàng. Emoji vừa phải.
                Trả lời bằng tiếng Việt.
                """;
        return callGroq(systemPrompt, message, null, 80);
    }

    // ─── Hỏi về sách lần đầu: kèm đầy đủ system prompt + data sách ─────────────
    private String handleBookQueryFirst(String message, Intent intent,
                                        List<Map<String, String>> history) {
        String bookContext = getBookContext();

        String role = switch (intent) {
            case BOOK_SEARCH    -> "Giúp khách tìm đúng sách họ cần dựa trên danh sách bên dưới.";
            case BOOK_INFO      -> "Cung cấp thông tin chi tiết chính xác về sách khách hỏi.";
            case BOOK_RECOMMEND -> "Gợi ý 2-3 cuốn phù hợp nhất với nhu cầu của khách.";
            default             -> "Hỗ trợ khách về sách.";
        };

        String systemPrompt = "Bạn là Bookish Assistant - trợ lý tư vấn sách của nhà sách Bookish. "
                + role + " "
                + "Thân thiện, ngắn gọn tối đa 150 từ, emoji vừa phải, bằng tiếng Việt. "
                + "CHỈ tư vấn sách có trong danh sách. Nếu không có → thông báo lịch sự. "
                + "DANH SÁCH SÁCH HIỆN CÓ:\n"
                + (bookContext.isBlank() ? "(Chưa có dữ liệu sách)" : bookContext);

        return callGroq(systemPrompt, message, history, 512);
    }

    // ─── FAQ: kèm BOOKISH_FAQ, không kèm data sách ──────────────────────────────
    private String handleFaq(String message, List<Map<String, String>> history, String topic) {
        String systemPrompt = "Bạn là Bookish Assistant - trợ lý hỗ trợ của nhà sách Bookish. "
                + "Trả lời câu hỏi về " + topic + " dựa trên thông tin sau. "
                + "Tối đa 100 từ, tiếng Việt, emoji vừa phải. "
                + "Nếu không có thông tin, hướng dẫn liên hệ hỗ trợ.\n"
                + BOOKISH_FAQ;
        return callGroq(systemPrompt, message, history, 256);
    }

    // ─── Fallback: không gọi AI, trả lời cứng luôn ──────────────────────────────
    private String handleFallback() {
        return "Xin lỗi, tôi chưa hiểu câu hỏi của bạn 😅 "
                + "Bạn có thể hỏi tôi về sách, đơn hàng, thanh toán hoặc vận chuyển nhé!";
    }

    // ─── Tin nhắn tiếp theo: giữ nguyên logic cũ ─────────────────────────────────
    private String handleContinueConversation(String message, List<Map<String, String>> history) {
        String systemPrompt = "Bạn là Bookish Assistant - trợ lý tư vấn sách của nhà sách Bookish. "
                + "Tiếp tục hỗ trợ khách dựa trên thông tin sách và FAQ đã được cung cấp ở đầu cuộc trò chuyện. "
                + "Chỉ tư vấn sách có trong danh sách đã biết. "
                + "Thân thiện, ngắn gọn, emoji vừa phải, tiếng Việt.";
        return callGroq(systemPrompt, message, history, 512);
    }

    // ─── Gọi Groq API dùng chung ─────────────────────────────────────────────────
    @SuppressWarnings("unchecked")
    private String callGroq(String systemPrompt, String userMessage,
                            List<Map<String, String>> history, int maxTokens) {
        List<Map<String, Object>> messages = new ArrayList<>();
        messages.add(Map.of("role", "system", "content", systemPrompt));

        // Thêm history (tối đa 20 lượt gần nhất)
        if (history != null && !history.isEmpty()) {
            int start = Math.max(0, history.size() - 20);
            for (int i = start; i < history.size(); i++) {
                Map<String, String> h = history.get(i);
                String role    = h.get("role");
                String content = h.get("content");
                if (role != null && content != null
                        && (role.equals("user") || role.equals("assistant"))) {
                    messages.add(Map.of("role", role, "content", content));
                }
            }
        }

        messages.add(Map.of("role", "user", "content", userMessage));

        Map<String, Object> requestBody = Map.of(
                "model",       MODEL,
                "messages",    messages,
                "temperature", 0.3,
                "max_tokens",  maxTokens
        );

        RestTemplate restTemplate = new RestTemplate();
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(groqApiKey);

        log.info("Calling Groq | maxTokens={} | messages={}", maxTokens, messages.size());

        ResponseEntity<Map> response = restTemplate.postForEntity(
                GROQ_URL, new HttpEntity<>(requestBody, headers), Map.class);

        if (response.getBody() == null) return "Xin lỗi, tôi không thể trả lời lúc này.";

        try {
            List<Map> choices = (List<Map>) response.getBody().get("choices");
            Map<String, Object> msg = (Map<String, Object>) choices.get(0).get("message");
            return (String) msg.get("content");
        } catch (Exception e) {
            log.error("Parse Groq response error: {}", e.getMessage());
            return "Xin lỗi, tôi không thể trả lời lúc này.";
        }
    }

    // ─── Lưu log ─────────────────────────────────────────────────────────────────
    private void saveChatLog(Integer userId, String message, String reply) {
        try {
            User user = userId != null ? userRepository.findById(userId).orElse(null) : null;
            chatbotLogRepository.save(ChatbotLog.builder()
                    .user(user).message(message).response(reply)
                    .createdAt(LocalDateTime.now()).build());
        } catch (Exception e) {
            log.warn("Failed to save chat log: {}", e.getMessage());
        }
    }
}