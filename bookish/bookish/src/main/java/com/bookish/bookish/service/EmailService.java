package com.bookish.bookish.service;

import com.bookish.bookish.exception.AppException;
import com.bookish.bookish.exception.ErrorCode;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;

@Slf4j
@Service
@RequiredArgsConstructor
public class EmailService {

    private final JavaMailSender mailSender;

    @Value("${app.mail.from}")
    private String mailFrom;

    /**
     * Gửi mã xác thực 6 chữ số tới email của user.
     */
    @Async
    public void sendVerificationCode(String toEmail, String username, String code) {
        String subject = "Mã xác thực Bookish: " + code;
        String html = buildCodeHtml(username, code);

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(
                    message, MimeMessageHelper.MULTIPART_MODE_MIXED_RELATED, StandardCharsets.UTF_8.name()
            );

            helper.setFrom(mailFrom);
            helper.setTo(toEmail);
            helper.setSubject(subject);
            helper.setText(html, true);

            mailSender.send(message);
            log.info("Đã gửi mã verify tới: {}", toEmail);

        } catch (MessagingException e) {
            log.error("Lỗi gửi mã verify tới {}: {}", toEmail, e.getMessage());
            throw new AppException(ErrorCode.EMAIL_SEND_FAILED);
        }
    }

    @Async
    public void sendResetPasswordCode(String toEmail, String username, String code) {
        String subject = "Mã đặt lại mật khẩu Bookish: " + code;
        String html = buildResetPasswordHtml(username, code);

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(
                    message, MimeMessageHelper.MULTIPART_MODE_MIXED_RELATED, StandardCharsets.UTF_8.name()
            );
            helper.setFrom(mailFrom);
            helper.setTo(toEmail);
            helper.setSubject(subject);
            helper.setText(html, true);
            mailSender.send(message);
            log.info("Đã gửi mã reset password tới: {}", toEmail);
        } catch (MessagingException e) {
            log.error("Lỗi gửi mã reset password tới {}: {}", toEmail, e.getMessage());
            throw new AppException(ErrorCode.EMAIL_SEND_FAILED);
        }
    }

    private String buildResetPasswordHtml(String username, String code) {
        return """
            <!DOCTYPE html>
            <html>
            <head><meta charset="UTF-8"></head>
            <body style="font-family: Arial, sans-serif; background:#f6f6f6; padding:20px;">
              <div style="max-width:520px; margin:auto; background:#fff; border-radius:12px; padding:40px 32px;">
                <h2 style="color:#1d1d1f; margin-top:0; text-align:center;">Đặt lại mật khẩu</h2>
                <p style="font-size:15px; color:#555; text-align:center; margin-bottom:32px;">
                  Chào %s, mã đặt lại mật khẩu của bạn là:
                </p>
                <div style="text-align:center; margin:32px 0;">
                  <div style="display:inline-block; padding:20px 40px; background:#fff3e0;
                              border-radius:12px; font-size:42px; font-weight:bold;
                              letter-spacing:12px; color:#ff6b35; font-family:'Courier New', monospace;">
                    %s
                  </div>
                </div>
                <p style="font-size:13px; color:#999; text-align:center;">
                  Mã có hiệu lực trong 15 phút.<br>
                  Nếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua email này và đổi mật khẩu ngay để bảo mật.
                </p>
              </div>
            </body>
            </html>
            """.formatted(username, code);
    }

    private String buildCodeHtml(String username, String code) {
        return """
                <!DOCTYPE html>
                <html>
                <head><meta charset="UTF-8"></head>
                <body style="font-family: Arial, sans-serif; background:#f6f6f6; padding:20px;">
                  <div style="max-width:520px; margin:auto; background:#fff; border-radius:12px; padding:40px 32px; box-shadow:0 2px 8px rgba(0,0,0,0.05);">
                    <h2 style="color:#1d1d1f; margin-top:0; text-align:center;">Chào %s 👋</h2>
                    <p style="font-size:15px; color:#555; text-align:center; margin-bottom:32px;">
                      Mã xác thực tài khoản <strong>Bookish</strong> của bạn là:
                    </p>
                    <div style="text-align:center; margin:32px 0;">
                      <div style="display:inline-block; padding:20px 40px; background:#f5f5f7;
                                  border-radius:12px; font-size:42px; font-weight:bold;
                                  letter-spacing:12px; color:#0071e3; font-family:'Courier New', monospace;">
                        %s
                      </div>
                    </div>
                    <p style="font-size:13px; color:#999; text-align:center;">
                      Mã có hiệu lực trong 10 phút.<br>
                      Nếu bạn không đăng ký tài khoản tại Bookish, hãy bỏ qua email này.
                    </p>
                  </div>
                </body>
                </html>
                """.formatted(username, code);
    }
}