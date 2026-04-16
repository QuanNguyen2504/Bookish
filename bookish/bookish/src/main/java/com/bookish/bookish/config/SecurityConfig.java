package com.bookish.bookish.config;

import com.bookish.bookish.security.JwtAuthenticationFilter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.cors.CorsConfigurationSource;

@Configuration
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtFilter;
    private final CorsConfigurationSource corsConfigurationSource;

    public SecurityConfig(JwtAuthenticationFilter jwtFilter,
                          CorsConfigurationSource corsConfigurationSource) {
        this.jwtFilter = jwtFilter;
        this.corsConfigurationSource = corsConfigurationSource;
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                .cors(cors -> cors.configurationSource(corsConfigurationSource))
                .csrf(csrf -> csrf.disable())
                .authorizeHttpRequests(auth -> auth
                        // AUTH (bao gồm /auth/verify-email và /auth/resend-verification)
                        .requestMatchers("/auth/**").permitAll()

                        // PUBLIC
                        .requestMatchers("/authors").permitAll()
                        .requestMatchers("/categories").permitAll()
                        .requestMatchers("/books").permitAll()
                        .requestMatchers("/books/*").permitAll()
                        .requestMatchers("/uploads/**").permitAll()
                        .requestMatchers("/promotions/**").permitAll()
                        .requestMatchers("/api/cart/**").permitAll()
                        .requestMatchers("/api/orders/**").permitAll()
                        .requestMatchers("/ws/**").permitAll()

                        .requestMatchers("/api/webhook/**").permitAll()
                        .requestMatchers("/api/chatbot").permitAll()

                        // REVIEW — GET public, POST cần login
                        .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/reviews/**").permitAll()
                        .requestMatchers("/api/reviews/**").authenticated()

                        //  MỚI: WISHLIST — chỉ user đã đăng nhập
                        .requestMatchers("/api/wishlist/**").authenticated()

                        // Cho phép user đã login upload/xóa avatar
                        .requestMatchers("/users/*/avatar").authenticated()

                        // Đổi mật khẩu — user tự đổi
                        .requestMatchers("/customers/*/change-password").authenticated()

                        // ADMIN + STAFF only
                        .requestMatchers("/api/admin/**").hasAnyAuthority("ADMIN", "STAFF")
                        .requestMatchers("/authors/**").hasAnyAuthority("ADMIN", "STAFF")
                        .requestMatchers("/categories/**").hasAnyAuthority("ADMIN", "STAFF")
                        .requestMatchers("/books/**").hasAnyAuthority("ADMIN", "STAFF")
                        .requestMatchers("/customers/**").hasAnyAuthority("ADMIN", "STAFF")
                        .requestMatchers("/staff/**").hasAnyAuthority("ADMIN", "STAFF")

                        .anyRequest().authenticated()
                )
                .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
