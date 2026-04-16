package com.bookish.bookish.service;

import com.bookish.bookish.dto.request.LoginRequest;
import com.bookish.bookish.dto.response.LoginResponse;
import com.bookish.bookish.entity.User;
import com.bookish.bookish.exception.AppException;
import com.bookish.bookish.exception.ErrorCode;
import com.bookish.bookish.repository.UserRepository;
import com.bookish.bookish.security.JwtUtil;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import com.bookish.bookish.dto.request.RegisterRequest;
import com.bookish.bookish.dto.response.CustomerResponse;
import com.bookish.bookish.entity.Role;
import com.bookish.bookish.mapper.UserMapper;

import java.time.LocalDateTime;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final JwtUtil jwtUtil;
    private final PasswordEncoder passwordEncoder;
    private final EmailService emailService;

    @Value("${app.verification.code-expiry-minutes:10}")
    private long codeExpiryMinutes;

    public AuthService(UserRepository userRepository,
                       JwtUtil jwtUtil,
                       PasswordEncoder passwordEncoder,
                       EmailService emailService) {
        this.userRepository = userRepository;
        this.jwtUtil = jwtUtil;
        this.passwordEncoder = passwordEncoder;
        this.emailService = emailService;
    }

    // Helper: sinh mã 6 chữ số ngẫu nhiên
    private String generateVerificationCode() {
        int code = new java.security.SecureRandom().nextInt(900000) + 100000;
        return String.valueOf(code); // "123456"
    }

    // =========================================================
    //  LOGIN — chặn nếu chưa verify email
    // =========================================================
    public LoginResponse login(LoginRequest request) {
        User user = userRepository
                .findByUsername(request.getUsername())
                .orElseThrow(() -> new AppException(ErrorCode.INVALID_LOGIN));

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new AppException(ErrorCode.INVALID_LOGIN);
        }

        if (Boolean.FALSE.equals(user.getEmailVerified())) {
            throw new AppException(ErrorCode.EMAIL_NOT_VERIFIED);
        }

        String token = jwtUtil.generateToken(user.getUsername(), user.getRole(), user.getId());
        return new LoginResponse(token, user.getRole(), user.getId(), user.getUsername(), user.getAvatarUrl());
    }

    // =========================================================
    //  REGISTER — tạo user + sinh mã 6 số + gửi mail
    // =========================================================
    public CustomerResponse register(RegisterRequest request) {
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new AppException(ErrorCode.USERNAME_EXISTED);
        }
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new AppException(ErrorCode.EMAIL_EXISTED);
        }

        String code = generateVerificationCode();

        User user = new User();
        user.setUsername(request.getUsername());
        user.setEmail(request.getEmail());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setRole(Role.USER);
        user.setEmailVerified(false);
        user.setVerificationCode(code);
        user.setVerificationCodeExpiry(LocalDateTime.now().plusMinutes(codeExpiryMinutes));
        userRepository.save(user);

        emailService.sendVerificationCode(user.getEmail(), user.getUsername(), code);

        return UserMapper.toCustomerResponse(user);
    }

    //  VERIFY — nhận email + code, trả JWT để auto-login
    public LoginResponse verifyEmail(String email, String code) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        if (Boolean.TRUE.equals(user.getEmailVerified())) {
            throw new AppException(ErrorCode.EMAIL_ALREADY_VERIFIED);
        }

        if (user.getVerificationCode() == null || !user.getVerificationCode().equals(code)) {
            throw new AppException(ErrorCode.INVALID_VERIFICATION_CODE);
        }

        if (user.getVerificationCodeExpiry() == null
                || user.getVerificationCodeExpiry().isBefore(LocalDateTime.now())) {
            throw new AppException(ErrorCode.VERIFICATION_CODE_EXPIRED);
        }

        user.setEmailVerified(true);
        user.setVerificationCode(null);
        user.setVerificationCodeExpiry(null);
        userRepository.save(user);

        // Auto-login: sinh JWT
        String jwt = jwtUtil.generateToken(user.getUsername(), user.getRole(), user.getId());
        return new LoginResponse(jwt, user.getRole(), user.getId(), user.getUsername(), user.getAvatarUrl());
    }


    //  RESEND — sinh mã mới và gửi lại
    public void resendVerificationCode(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        if (Boolean.TRUE.equals(user.getEmailVerified())) {
            throw new AppException(ErrorCode.EMAIL_ALREADY_VERIFIED);
        }

        String newCode = generateVerificationCode();
        user.setVerificationCode(newCode);
        user.setVerificationCodeExpiry(LocalDateTime.now().plusMinutes(codeExpiryMinutes));
        userRepository.save(user);

        emailService.sendVerificationCode(user.getEmail(), user.getUsername(), newCode);
    }


    //  CHANGE EMAIL BEFORE VERIFY — đổi email khi login bị chặn

    public void changeEmailBeforeVerify(String username, String password, String newEmail) {
        // 1. Verify user/password để tránh người lạ đổi email người khác
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new AppException(ErrorCode.INVALID_LOGIN));

        if (!passwordEncoder.matches(password, user.getPassword())) {
            throw new AppException(ErrorCode.INVALID_LOGIN);
        }

        // 2. Chỉ cho đổi khi chưa verify
        if (Boolean.TRUE.equals(user.getEmailVerified())) {
            throw new AppException(ErrorCode.EMAIL_ALREADY_VERIFIED);
        }

        // 3. Email mới không được trùng với user khác
        userRepository.findByEmail(newEmail).ifPresent(existing -> {
            if (!existing.getId().equals(user.getId())) {
                throw new AppException(ErrorCode.EMAIL_EXISTED);
            }
        });

        // 4. Update email + sinh mã mới
        String newCode = generateVerificationCode();
        user.setEmail(newEmail);
        user.setVerificationCode(newCode);
        user.setVerificationCodeExpiry(LocalDateTime.now().plusMinutes(codeExpiryMinutes));
        userRepository.save(user);

        // 5. Gửi mã mới tới email mới
        emailService.sendVerificationCode(newEmail, user.getUsername(), newCode);
    }


//  FORGOT PASSWORD — sinh mã 6 số gửi mail

    public void forgotPassword(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        // Yêu cầu user phải verify email rồi mới được reset
        if (Boolean.FALSE.equals(user.getEmailVerified())) {
            throw new AppException(ErrorCode.EMAIL_NOT_VERIFIED);
        }

        String code = generateVerificationCode();
        user.setVerificationCode(code);
        // Mã reset password chỉ sống 15 phút
        user.setVerificationCodeExpiry(LocalDateTime.now().plusMinutes(15));
        userRepository.save(user);

        emailService.sendResetPasswordCode(user.getEmail(), user.getUsername(), code);
    }


//  RESET PASSWORD — verify mã + update mật khẩu mới

    public void resetPassword(String email, String code, String newPassword) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        if (user.getVerificationCode() == null || !user.getVerificationCode().equals(code)) {
            throw new AppException(ErrorCode.INVALID_RESET_CODE);
        }

        if (user.getVerificationCodeExpiry() == null
                || user.getVerificationCodeExpiry().isBefore(LocalDateTime.now())) {
            throw new AppException(ErrorCode.INVALID_RESET_CODE);
        }

        // Update password (BCrypt) + xoá mã
        user.setPassword(passwordEncoder.encode(newPassword));
        user.setVerificationCode(null);
        user.setVerificationCodeExpiry(null);
        userRepository.save(user);
    }


}