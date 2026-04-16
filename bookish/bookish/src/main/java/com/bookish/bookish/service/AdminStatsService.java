package com.bookish.bookish.service;

import com.bookish.bookish.dto.response.StatsResponse;
import com.bookish.bookish.entity.Order;
import com.bookish.bookish.entity.OrderItem;
import com.bookish.bookish.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

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
        List<Order> allOrders = orderRepository.findAll();

        BigDecimal totalRevenue = allOrders.stream()
                .filter(o -> !o.getStatus().equals("CANCELLED"))
                .map(Order::getTotalPrice)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        long totalOrders = allOrders.size();

        BigDecimal avgOrderValue = totalOrders > 0
                ? totalRevenue.divide(BigDecimal.valueOf(totalOrders), 0, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;

        long delivered = allOrders.stream()
                .filter(o -> o.getStatus().equals("DELIVERED")).count();

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
                .pendingOrders(allOrders.stream().filter(o -> o.getStatus().equals("PENDING")).count())
                .processingOrders(allOrders.stream().filter(o ->
                        o.getStatus().equals("PROCESSING") || o.getStatus().equals("SHIPPING") || o.getStatus().equals("CONFIRMED")).count())
                .deliveredOrders(delivered)
                .cancelledOrders(allOrders.stream().filter(o -> o.getStatus().equals("CANCELLED")).count())
                .build();
    }

    @Transactional(readOnly = true)
    public List<StatsResponse.MonthlyRevenue> getMonthlyRevenue() {
        List<Order> orders = orderRepository.findAll().stream()
                .filter(o -> !o.getStatus().equals("CANCELLED"))
                .toList();

        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("MM/yyyy");
        Map<String, List<Order>> grouped = orders.stream()
                .collect(Collectors.groupingBy(o -> o.getCreatedAt().format(fmt)));

        // 12 tháng gần nhất
        List<StatsResponse.MonthlyRevenue> result = new ArrayList<>();
        LocalDate now = LocalDate.now();
        for (int i = 11; i >= 0; i--) {
            LocalDate month = now.minusMonths(i);
            String key = month.format(DateTimeFormatter.ofPattern("MM/yyyy"));
            String label = "T" + month.getMonthValue() + "/" + month.getYear();
            List<Order> monthOrders = grouped.getOrDefault(key, List.of());
            BigDecimal revenue = monthOrders.stream()
                    .map(Order::getTotalPrice)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            result.add(StatsResponse.MonthlyRevenue.builder()
                    .month(label)
                    .revenue(revenue)
                    .orders(monthOrders.size())
                    .build());
        }
        return result;
    }

    @Transactional(readOnly = true)
    public List<StatsResponse.DailyOrders> getDailyOrders() {
        LocalDateTime from = LocalDateTime.now().minusDays(6).toLocalDate().atStartOfDay();
        List<Order> orders = orderRepository.findAll().stream()
                .filter(o -> o.getCreatedAt().isAfter(from))
                .toList();

        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("dd/MM");
        Map<String, Long> grouped = orders.stream()
                .collect(Collectors.groupingBy(
                        o -> o.getCreatedAt().format(fmt),
                        Collectors.counting()
                ));

        List<StatsResponse.DailyOrders> result = new ArrayList<>();
        for (int i = 6; i >= 0; i--) {
            LocalDate day = LocalDate.now().minusDays(i);
            String key = day.format(fmt);
            result.add(StatsResponse.DailyOrders.builder()
                    .date(key)
                    .orders(grouped.getOrDefault(key, 0L))
                    .build());
        }
        return result;
    }

    @Transactional(readOnly = true)
    public List<StatsResponse.TopBook> getTopBooks(int limit) {
        List<OrderItem> allItems = orderItemRepository.findAll().stream()
                .filter(oi -> !oi.getOrder().getStatus().equals("CANCELLED"))
                .toList();

        Map<Integer, Long> soldCount = allItems.stream()
                .collect(Collectors.groupingBy(
                        oi -> oi.getBook().getBook_id(),
                        Collectors.summingLong(OrderItem::getQuantity)
                ));

        Map<Integer, BigDecimal> revenue = allItems.stream()
                .collect(Collectors.groupingBy(
                        oi -> oi.getBook().getBook_id(),
                        Collectors.reducing(BigDecimal.ZERO,
                                oi -> oi.getPrice().multiply(BigDecimal.valueOf(oi.getQuantity())),
                                BigDecimal::add)
                ));

        return revenue.entrySet().stream()
                .sorted(Map.Entry.<Integer, BigDecimal>comparingByValue().reversed())
                .limit(limit)
                .map(e -> {
                    var book = bookRepository.findById(e.getKey()).orElse(null);
                    if (book == null) return null;
                    String author = book.getAuthors().stream()
                            .findFirst().map(a -> a.getName()).orElse("Không rõ");
                    return StatsResponse.TopBook.builder()
                            .bookId(book.getBook_id())
                            .title(book.getTitle())
                            .image(book.getImage())
                            .authorName(author)
                            .soldCount(soldCount.getOrDefault(e.getKey(), 0L))
                            .revenue(e.getValue())
                            .build();
                })
                .filter(Objects::nonNull)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<StatsResponse.CategoryStat> getCategoryStats() {
        // Đếm trực tiếp từ sách, tránh dùng LIKE query gây trùng lặp
        Map<String, Long> countByCategory = bookRepository.findAll().stream()
                .flatMap(b -> b.getCategories().stream())
                .collect(Collectors.groupingBy(
                        cat -> cat.getName(),
                        Collectors.counting()
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

    @Transactional(readOnly = true)
    public List<StatsResponse.OrderStatusStat> getOrderStatusStats() {
        List<Order> orders = orderRepository.findAll();
        Map<String, Long> grouped = orders.stream()
                .collect(Collectors.groupingBy(Order::getStatus, Collectors.counting()));

        Map<String, String> labels = Map.of(
                "PENDING",    "Chờ xác nhận",
                "CONFIRMED",  "Đã xác nhận",
                "PROCESSING", "Đang xử lý",
                "SHIPPING",   "Đang giao",
                "DELIVERED",  "Hoàn thành",
                "CANCELLED",  "Đã hủy"
        );

        return grouped.entrySet().stream()
                .map(e -> StatsResponse.OrderStatusStat.builder()
                        .name(labels.getOrDefault(e.getKey(), e.getKey()))
                        .value(e.getValue())
                        .build())
                .toList();
    }
}