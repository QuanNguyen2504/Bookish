package com.bookish.bookish.service;

import com.bookish.bookish.dto.response.StatsResponse;
import com.bookish.bookish.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
@RequiredArgsConstructor
public class AdminStatsService {

    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;
    private final BookRepository bookRepository;
    private final UserRepository userRepository;
    private final CategoryRepository categoryRepository;


    @Transactional(readOnly = true)
    public StatsResponse.Summary getSummary() {
        BigDecimal totalRevenue = orderRepository.sumTotalRevenue();
        long totalOrders       = orderRepository.countAllOrders();
        long delivered         = orderRepository.countByStatus("DELIVERED");
        long pending           = orderRepository.countByStatus("PENDING");
        long processing        = orderRepository.countByStatus("PROCESSING")
                + orderRepository.countByStatus("SHIPPING")
                + orderRepository.countByStatus("CONFIRMED");
        long cancelled         = orderRepository.countByStatus("CANCELLED");

        BigDecimal avgOrderValue = totalOrders > 0
                ? totalRevenue.divide(BigDecimal.valueOf(totalOrders), 0, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;

        double completionRate = totalOrders > 0
                ? Math.round((double) delivered / totalOrders * 1000.0) / 10.0
                : 0;

        return StatsResponse.Summary.builder()
                .totalRevenue(totalRevenue)
                .totalOrders(totalOrders)
                .avgOrderValue(avgOrderValue)
                .completionRate(completionRate)
                .totalBooks(bookRepository.count())
                .totalUsers(userRepository.count())
                .pendingOrders(pending)
                .processingOrders(processing)
                .deliveredOrders(delivered)
                .cancelledOrders(cancelled)
                .build();
    }

    @Transactional(readOnly = true)
    public List<StatsResponse.MonthlyRevenue> getMonthlyRevenue() {
        LocalDateTime from = LocalDate.now().minusMonths(11)
                .withDayOfMonth(1).atStartOfDay();

        // Query trả về [month(int), year(int), revenue, orderCount]
        List<Object[]> rows = orderRepository.getMonthlyRevenueRaw(from);

        // Tạo map: "MM/yyyy" -> row
        Map<String, Object[]> rowMap = new LinkedHashMap<>();
        for (Object[] row : rows) {
            int month = ((Number) row[0]).intValue();
            int year  = ((Number) row[1]).intValue();
            String key = String.format("%02d/%04d", month, year);
            rowMap.put(key, row);
        }

        // Sinh đủ 12 tháng (tháng không có đơn → 0)
        List<StatsResponse.MonthlyRevenue> result = new ArrayList<>();
        LocalDate now = LocalDate.now();
        for (int i = 11; i >= 0; i--) {
            LocalDate month = now.minusMonths(i);
            String key   = month.format(DateTimeFormatter.ofPattern("MM/yyyy"));
            String label = "T" + month.getMonthValue() + "/" + month.getYear();

            Object[] row = rowMap.get(key);
            BigDecimal revenue = row != null ? (BigDecimal) row[2] : BigDecimal.ZERO;
            long orderCount    = row != null ? ((Number) row[3]).longValue() : 0L;

            result.add(StatsResponse.MonthlyRevenue.builder()
                    .month(label)
                    .revenue(revenue)
                    .orders(orderCount)
                    .build());
        }
        return result;
    }

    @Transactional(readOnly = true)
    public List<StatsResponse.DailyOrders> getDailyOrders() {
        LocalDateTime from = LocalDate.now().minusDays(6).atStartOfDay();

        // Query trả về [date(LocalDate), count]
        List<Object[]> rows = orderRepository.getDailyOrdersRaw(from);

        Map<String, Long> dayMap = new LinkedHashMap<>();
        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("dd/MM");
        for (Object[] row : rows) {
            // row[0] có thể là LocalDate hoặc java.sql.Date tùy DB
            String key = row[0].toString(); // "yyyy-MM-dd"
            try {
                LocalDate date = LocalDate.parse(key);
                dayMap.put(date.format(fmt), ((Number) row[1]).longValue());
            } catch (Exception e) {
                // fallback nếu format khác
            }
        }

        List<StatsResponse.DailyOrders> result = new ArrayList<>();
        for (int i = 6; i >= 0; i--) {
            LocalDate day = LocalDate.now().minusDays(i);
            String key = day.format(fmt);
            result.add(StatsResponse.DailyOrders.builder()
                    .date(key)
                    .orders(dayMap.getOrDefault(key, 0L))
                    .build());
        }
        return result;
    }

    @Transactional(readOnly = true)
    public List<StatsResponse.TopBook> getTopBooks(int limit) {
        // Query trả về [bookId, title, image, soldCount, revenue]
        List<Object[]> rows = orderItemRepository.getTopBooksByRevenue(
                PageRequest.of(0, limit));

        List<StatsResponse.TopBook> result = new ArrayList<>();
        for (Object[] row : rows) {
            Integer bookId   = (Integer) row[0];
            String title     = (String)  row[1];
            String image     = (String)  row[2];
            long soldCount   = ((Number) row[3]).longValue();
            BigDecimal rev   = (BigDecimal) row[4];

            // Lấy tên tác giả đầu tiên (1 query nhỏ, chấp nhận được vì limit=10)
            String authorName = bookRepository.findById(bookId)
                    .map(b -> b.getAuthors().stream()
                            .findFirst().map(a -> a.getName()).orElse("Không rõ"))
                    .orElse("Không rõ");

            result.add(StatsResponse.TopBook.builder()
                    .bookId(bookId)
                    .title(title)
                    .image(image)
                    .authorName(authorName)
                    .soldCount(soldCount)
                    .revenue(rev)
                    .build());
        }
        return result;
    }

    @Transactional(readOnly = true)
    public List<StatsResponse.OrderStatusStat> getOrderStatusStats() {
        Map<String, String> labels = Map.of(
                "PENDING",    "Chờ xác nhận",
                "CONFIRMED",  "Đã xác nhận",
                "PROCESSING", "Đang xử lý",
                "SHIPPING",   "Đang giao",
                "DELIVERED",  "Hoàn thành",
                "CANCELLED",  "Đã hủy"
        );

        return orderRepository.getOrderStatusStats().stream()
                .map(row -> StatsResponse.OrderStatusStat.builder()
                        .name(labels.getOrDefault((String) row[0], (String) row[0]))
                        .value(((Number) row[1]).longValue())
                        .build())
                .toList();
    }

    // getCategoryStats và getLowStockBooks giữ nguyên (ít data, ổn)
    @Transactional(readOnly = true)
    public List<StatsResponse.CategoryStat> getCategoryStats() {
        Map<String, Long> countByCategory = bookRepository.findAll().stream()
                .flatMap(b -> b.getCategories().stream())
                .collect(java.util.stream.Collectors.groupingBy(
                        cat -> cat.getName(),
                        java.util.stream.Collectors.counting()
                ));

        return countByCategory.entrySet().stream()
                .filter(e -> e.getValue() > 0)
                .sorted(Map.Entry.<String, Long>comparingByValue().reversed())
                .map(e -> StatsResponse.CategoryStat.builder()
                        .name(e.getKey())
                        .bookCount(e.getValue())
                        .build())
                .toList();
    }

    @Transactional(readOnly = true)
    public List<StatsResponse.LowStockBook> getLowStockBooks(int threshold) {
        return bookRepository.findAll().stream()
                .filter(b -> b.getStock() != null && b.getStock() < threshold)
                .sorted(Comparator.comparingInt(b -> b.getStock()))
                .limit(10)
                .map(b -> {
                    String author = b.getAuthors().stream()
                            .findFirst().map(a -> a.getName()).orElse("Không rõ");
                    return StatsResponse.LowStockBook.builder()
                            .bookId(b.getBook_id())
                            .title(b.getTitle())
                            .image(b.getImage())
                            .authorName(author)
                            .stock(b.getStock())
                            .build();
                })
                .toList();
    }
}
