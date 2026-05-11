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
                        // AUTH
                        .requestMatchers("/auth/**").permitAll()

                        // PUBLIC
                        .requestMatchers("/authors").permitAll()
                        .requestMatchers("/categories").permitAll()
                        .requestMatchers("/books").permitAll()
                        .requestMatchers("/books/*").permitAll()
                        .requestMatchers("/uploads/**").permitAll()

                        // PROMOTIONS
                        .requestMatchers(org.springframework.http.HttpMethod.GET, "/promotions").permitAll()
                        .requestMatchers(org.springframework.http.HttpMethod.GET, "/promotions/*").permitAll()
                        .requestMatchers(org.springframework.http.HttpMethod.POST, "/promotions/validate").authenticated()
                        .requestMatchers("/promotions/**").hasAnyAuthority("ADMIN", "STAFF")
                        .requestMatchers("/promotions/all").hasAnyAuthority("ADMIN", "STAFF")

                        .requestMatchers("/api/cart/**").permitAll()
                        .requestMatchers("/api/orders/**").permitAll()
                        .requestMatchers("/ws/**").permitAll()
                        .requestMatchers("/api/webhook/**").permitAll()
                        .requestMatchers("/api/shipping/**").permitAll()

                        // CHATBOT — permit cả POST chat lẫn GET cache (debug)
                        .requestMatchers("/api/chatbot").permitAll()
                        .requestMatchers("/api/chatbot/**").permitAll()

                        // REVIEW
                        .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/reviews/**").permitAll()
                        .requestMatchers("/api/reviews/**").authenticated()

                        // WISHLIST
                        .requestMatchers("/api/wishlist/**").authenticated()

                        // RETURN
                        .requestMatchers("/api/returns/**").authenticated()

                        // AVATAR & PASSWORD
                        .requestMatchers("/users/*/avatar").authenticated()
                        .requestMatchers("/customers/*/change-password").authenticated()

                        // ADMIN + STAFF only
                        .requestMatchers("/api/admin/**").hasAnyAuthority("ADMIN", "STAFF")
                        .requestMatchers("/authors/**").hasAnyAuthority("ADMIN", "STAFF")
                        .requestMatchers("/categories/**").hasAnyAuthority("ADMIN", "STAFF")
                        .requestMatchers("/books/**").hasAnyAuthority("ADMIN", "STAFF")
                        .requestMatchers("/customers/**").hasAnyAuthority("ADMIN", "STAFF")
                        .requestMatchers("/staff/**").hasAnyAuthority("ADMIN", "STAFF")
                        .requestMatchers("/books/admin/**").hasAnyAuthority("ADMIN", "STAFF")

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