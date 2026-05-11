package com.bookish.bookish.service;

import com.bookish.bookish.dto.response.ShippingFeeResponse;
import com.bookish.bookish.exception.AppException;
import com.bookish.bookish.exception.ErrorCode;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.util.List;

@Service
@Slf4j
public class ShippingService {

    /**
     * Địa chỉ cửa hàng — cấu hình trong application.properties
     * Ví dụ: shipping.store-address=123 Cầu Giấy, Hà Nội, Việt Nam
     */
    @Value("${shipping.store-address:Cầu Giấy, Hà Nội, Việt Nam}")
    private String storeAddress;

    /**
     * Tọa độ cửa hàng (mặc định: trung tâm Hà Nội)
     * Thay bằng tọa độ thật của cửa hàng trong application.properties
     */
    @Value("${shipping.store-lat:21.0285}")
    private double storeLat;

    @Value("${shipping.store-lon:105.8542}")
    private double storeLon;

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    /**
     * Nominatim API (OpenStreetMap) — MIỄN PHÍ, không cần API key
     * Giới hạn: 1 request/giây (đủ dùng cho đồ án)
     */
    private static final String NOMINATIM_URL =
            "https://nominatim.openstreetmap.org/search?q={q}&format=json&limit=1&countrycodes=vn";

    // ==================== PUBLIC API ====================

    /**
     * Tính phí ship dựa trên khoảng cách:
     * 1. Geocode địa chỉ khách → tọa độ (lat, lon) qua Nominatim
     * 2. Tính khoảng cách bằng công thức Haversine
     * 3. Nhân hệ số 1.3 ước lượng đường đi thật
     * 4. Áp bảng giá theo bậc khoảng cách
     */
    public ShippingFeeResponse calculateShippingFee(String destinationAddress) {
        if (destinationAddress == null || destinationAddress.trim().length() < 5) {
            throw new AppException(ErrorCode.INVALID_SHIPPING_ADDRESS);
        }

        try {
            // Bước 1: Geocode địa chỉ khách → tọa độ
            double[] destCoords = geocode(destinationAddress.trim());
            double destLat = destCoords[0];
            double destLon = destCoords[1];

            // Bước 2: Tính khoảng cách Haversine (đường chim bay)
            double straightKm = haversine(storeLat, storeLon, destLat, destLon);

            // Bước 3: Nhân hệ số 1.3 ước lượng đường đi thật
            double estimatedKm = straightKm * 1.3;
            double roundedKm = Math.round(estimatedKm * 10.0) / 10.0;

            // Bước 4: Tính phí ship
            BigDecimal shippingFee = calculateFeeByDistance(roundedKm);
            String feeDescription = getDistanceZone(roundedKm);

            return ShippingFeeResponse.builder()
                    .distanceKm(roundedKm)
                    .distanceText(roundedKm + " km")
                    .durationText(estimateDuration(roundedKm))
                    .shippingFee(shippingFee)
                    .feeDescription(feeDescription)
                    .originAddress(storeAddress)
                    .destinationAddress(destinationAddress.trim())
                    .build();

        } catch (AppException e) {
            throw e;
        } catch (Exception e) {
            log.error("Shipping calculation error: ", e);
            throw new AppException(ErrorCode.SHIPPING_CALCULATION_FAILED);
        }
    }

    /**
     * Phí ship mặc định (fallback khi geocoding lỗi)
     */
    public BigDecimal getDefaultShippingFee() {
        return BigDecimal.valueOf(50000);
    }

    // ==================== GEOCODING (Nominatim — miễn phí) ====================

    /**
     * Chuyển địa chỉ text → tọa độ [lat, lon]
     * Tự chuẩn hóa địa chỉ + thử nhiều biến thể nếu lần đầu không tìm thấy
     */
    private double[] geocode(String address) {
        // Tạo danh sách các biến thể địa chỉ để thử
        List<String> variants = buildAddressVariants(address);

        for (String variant : variants) {
            double[] result = tryGeocode(variant);
            if (result != null) {
                log.info("Geocoded '{}' → ({}, {})", variant, result[0], result[1]);
                return result;
            }
        }

        log.warn("Nominatim: không tìm thấy bất kỳ biến thể nào của '{}'", address);
        throw new AppException(ErrorCode.SHIPPING_ROUTE_NOT_FOUND);
    }

    /**
     * Thử geocode 1 địa chỉ cụ thể, trả null nếu không tìm thấy
     */
    private double[] tryGeocode(String address) {
        try {
            log.info("Nominatim geocoding: '{}'", address);

            HttpHeaders headers = new HttpHeaders();
            headers.set("User-Agent", "Bookish-Bookstore/1.0 (contact@bookish.vn)");
            headers.set("Accept", "application/json");
            headers.set("Accept-Language", "vi,en");
            HttpEntity<String> entity = new HttpEntity<>(headers);

            // Dùng URI template — RestTemplate tự encode đúng chuẩn RFC 3986
            var response = restTemplate.exchange(
                    NOMINATIM_URL, HttpMethod.GET, entity, String.class, address);
            String body = response.getBody();

            log.info("Nominatim response: {}", body != null && body.length() > 300
                    ? body.substring(0, 300) + "..." : body);

            JsonNode results = objectMapper.readTree(body);

            if (results == null || !results.isArray() || results.isEmpty()) {
                return null;
            }

            JsonNode first = results.get(0);
            double lat = first.path("lat").asDouble();
            double lon = first.path("lon").asDouble();

            if (lat == 0.0 && lon == 0.0) return null;

            return new double[]{lat, lon};

        } catch (Exception e) {
            log.debug("Geocode attempt failed for '{}': {}", address, e.getMessage());
            return null;
        }
    }

    /**
     * Chuẩn hóa địa chỉ Việt Nam → tạo nhiều biến thể để tăng tỷ lệ tìm thấy
     * Ví dụ: "Thành phố Vinh - Nghệ An" → thử:
     *   1. "Thành phố Vinh, Nghệ An, Việt Nam"
     *   2. "Vinh, Nghệ An, Việt Nam"
     *   3. "Nghệ An, Việt Nam"
     */
    private List<String> buildAddressVariants(String raw) {
        List<String> variants = new java.util.ArrayList<>();

        // Chuẩn hóa: thay dấu gạch, bỏ khoảng trắng thừa
        String normalized = raw
                .replace(" - ", ", ")
                .replace(" – ", ", ")
                .replace(" _ ", ", ")
                .replace("-", ", ")
                .replaceAll(",\\s*,", ",")        // bỏ dấu phẩy kép
                .replaceAll("\\s+", " ")          // bỏ khoảng trắng thừa
                .trim();

        // Thêm ", Việt Nam" nếu chưa có
        String withCountry = normalized.toLowerCase().contains("việt nam")
                ? normalized
                : normalized + ", Việt Nam";

        // Biến thể 1: địa chỉ đầy đủ đã chuẩn hóa
        variants.add(withCountry);

        // Biến thể 2: bỏ prefix "Thành phố", "Quận", "Huyện", "Thị xã", "Phường", "Xã"
        String simplified = withCountry
                .replaceAll("(?i)thành phố\\s*", "")
                .replaceAll("(?i)quận\\s*", "")
                .replaceAll("(?i)huyện\\s*", "")
                .replaceAll("(?i)thị xã\\s*", "")
                .replaceAll("(?i)phường\\s*", "")
                .replaceAll("(?i)xã\\s*", "")
                .replaceAll("(?i)tỉnh\\s*", "")
                .replaceAll("^[,\\s]+", "")       // bỏ dấu phẩy đầu
                .trim();
        if (!simplified.equals(withCountry)) {
            variants.add(simplified);
        }

        // Biến thể 3: chỉ lấy phần cuối (tỉnh/thành phố)
        String[] parts = withCountry.split(",");
        if (parts.length >= 3) {
            // Lấy 2 phần cuối: "Nghệ An, Việt Nam"
            String lastTwo = (parts[parts.length - 2].trim() + ", " + parts[parts.length - 1].trim());
            variants.add(lastTwo);
        }

        return variants;
    }

    // ==================== HAVERSINE (công thức toán — offline) ====================

    /**
     * Công thức Haversine — tính khoảng cách giữa 2 tọa độ trên Trái Đất (km)
     * Kết quả: đường chim bay, sai số < 0.5%
     */
    private double haversine(double lat1, double lon1, double lat2, double lon2) {
        final double R = 6371.0; // bán kính Trái Đất (km)

        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);

        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(dLon / 2) * Math.sin(dLon / 2);

        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return R * c;
    }

    // ==================== BẢNG GIÁ SHIP ====================

    /**
     * Tính phí ship theo khoảng cách (tùy chỉnh tại đây)
     */
    private BigDecimal calculateFeeByDistance(double distanceKm) {
        if (distanceKm <= 5)    return BigDecimal.valueOf(15000);   // 15k — Rất gần
        if (distanceKm <= 10)   return BigDecimal.valueOf(20000);   // 20k — Nội thành
        if (distanceKm <= 30)   return BigDecimal.valueOf(30000);   // 30k — Ngoại thành
        if (distanceKm <= 100)  return BigDecimal.valueOf(45000);   // 45k — Lân cận
        if (distanceKm <= 300)  return BigDecimal.valueOf(60000);   // 60k — Liên tỉnh gần
        if (distanceKm <= 700)  return BigDecimal.valueOf(80000);   // 80k — Liên tỉnh xa
        if (distanceKm <= 1200) return BigDecimal.valueOf(100000);  // 100k — Rất xa
        return BigDecimal.valueOf(120000);                           // 120k — Cực xa
    }

    /**
     * Mô tả vùng giao hàng
     */
    private String getDistanceZone(double distanceKm) {
        if (distanceKm <= 5)    return "Khu vực rất gần (0-5km)";
        if (distanceKm <= 10)   return "Nội thành (5-10km)";
        if (distanceKm <= 30)   return "Ngoại thành (10-30km)";
        if (distanceKm <= 100)  return "Lân cận (30-100km)";
        if (distanceKm <= 300)  return "Liên tỉnh gần (100-300km)";
        if (distanceKm <= 700)  return "Liên tỉnh xa (300-700km)";
        if (distanceKm <= 1200) return "Rất xa (700-1200km)";
        return "Cực xa (trên 1200km)";
    }

    /**
     * Ước lượng thời gian giao hàng
     */
    private String estimateDuration(double distanceKm) {
        if (distanceKm <= 10)   return "1 - 2 ngày";
        if (distanceKm <= 30)   return "2 - 3 ngày";
        if (distanceKm <= 100)  return "3 - 4 ngày";
        if (distanceKm <= 300)  return "4 - 5 ngày";
        if (distanceKm <= 700)  return "5 - 6 ngày";
        if (distanceKm <= 1200) return "6 - 7 ngày";
        return "3 - 5 ngày";
    }
}