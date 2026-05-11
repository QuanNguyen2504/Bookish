package com.bookish.bookish.repository;

import com.bookish.bookish.entity.Order;
import com.bookish.bookish.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public interface OrderRepository extends JpaRepository<Order, Integer> {

    List<Order> findByUserOrderByCreatedAtDesc(User user);
    List<Order> findAllByOrderByCreatedAtDesc();
    List<Order> findByStatusAndPaymentMethodAndCreatedAtBefore(
            String status, String paymentMethod, LocalDateTime before);
    List<Order> findByStatusAndPaymentMethod(String status, String paymentMethod);
    List<Order> findByStatus(String status);
    Page<Order> findByStatusOrderByCreatedAtDesc(String status, Pageable pageable);

    @Query("SELECT o FROM Order o ORDER BY o.createdAt DESC")
    Page<Order> findAllPaged(Pageable pageable);



    /** Tổng doanh thu (không tính đơn CANCELLED) */
    @Query("SELECT COALESCE(SUM(o.totalPrice), 0) FROM Order o WHERE o.status != 'CANCELLED'")
    BigDecimal sumTotalRevenue();

    /** Đếm tổng đơn hàng */
    @Query("SELECT COUNT(o) FROM Order o")
    long countAllOrders();

    /** Đếm đơn theo trạng thái */
    @Query("SELECT COUNT(o) FROM Order o WHERE o.status = :status")
    long countByStatus(@Param("status") String status);

    /** Doanh thu + số đơn theo tháng (12 tháng gần nhất) */
    @Query("""
        SELECT FUNCTION('MONTH', o.createdAt), FUNCTION('YEAR', o.createdAt),
               COALESCE(SUM(o.totalPrice), 0), COUNT(o)
        FROM Order o
        WHERE o.status != 'CANCELLED'
          AND o.createdAt >= :from
        GROUP BY FUNCTION('YEAR', o.createdAt), FUNCTION('MONTH', o.createdAt)
        ORDER BY FUNCTION('YEAR', o.createdAt) ASC, FUNCTION('MONTH', o.createdAt) ASC
    """)
    List<Object[]> getMonthlyRevenueRaw(@Param("from") LocalDateTime from);

    /** Đếm đơn hàng theo ngày (7 ngày gần nhất) */
    @Query("""
        SELECT CAST(o.createdAt AS date), COUNT(o)
        FROM Order o
        WHERE o.createdAt >= :from
        GROUP BY CAST(o.createdAt AS date)
        ORDER BY CAST(o.createdAt AS date) ASC
    """)
    List<Object[]> getDailyOrdersRaw(@Param("from") LocalDateTime from);

    /** Thống kê đơn theo trạng thái (cho pie chart) */
    @Query("SELECT o.status, COUNT(o) FROM Order o GROUP BY o.status")
    List<Object[]> getOrderStatusStats();
}
