package com.bookish.bookish.service;

import com.bookish.bookish.dto.response.CustomerResponse;
import com.bookish.bookish.entity.User;
import com.bookish.bookish.exception.AppException;
import com.bookish.bookish.exception.ErrorCode;
import com.bookish.bookish.mapper.UserMapper;
import com.bookish.bookish.repository.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.*;
import java.util.List;
import java.util.UUID;

@Service
public class AvatarService {

    private final UserRepository userRepository;

    // Khớp với WebConfig hiện có: upload.dir=uploads
    @Value("${upload.dir:uploads}")
    private String uploadDir;

    @Value("${app.base-url:http://localhost:8080}")
    private String baseUrl;

    private static final List<String> ALLOWED_TYPES = List.of(
            "image/jpeg", "image/png", "image/webp", "image/gif"
    );

    public AvatarService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public CustomerResponse uploadAvatar(Integer userId, MultipartFile file) throws IOException {
        // Validate định dạng
        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_TYPES.contains(contentType)) {
            throw new AppException(ErrorCode.INVALID_FILE_TYPE);
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        // Xóa ảnh cũ trên disk nếu có
        deleteFileFromDisk(user.getAvatarUrl());

        // Lưu file mới vào uploads/avatars/
        String extension = getExtension(file.getOriginalFilename());
        String newFilename = UUID.randomUUID() + extension;

        Path dirPath = Paths.get(uploadDir, "avatars");
        Files.createDirectories(dirPath);
        Files.copy(file.getInputStream(), dirPath.resolve(newFilename),
                StandardCopyOption.REPLACE_EXISTING);

        // URL truy cập: /uploads/avatars/filename.jpg
        String avatarUrl = baseUrl + "/uploads/avatars/" + newFilename;
        user.setAvatarUrl(avatarUrl);
        return UserMapper.toCustomerResponse(userRepository.save(user));
    }

    public void deleteAvatar(Integer userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        deleteFileFromDisk(user.getAvatarUrl());
        user.setAvatarUrl(null);
        userRepository.save(user);
    }

    private void deleteFileFromDisk(String avatarUrl) {
        if (avatarUrl == null || avatarUrl.isBlank()) return;
        try {
            // Lấy phần path sau base-url: /uploads/avatars/filename.jpg
            String filePath = avatarUrl.replaceFirst(baseUrl, "").replaceFirst("^/uploads/", "");
            Files.deleteIfExists(Paths.get(uploadDir).resolve(filePath));
        } catch (IOException ignored) {}
    }

    private String getExtension(String filename) {
        if (filename == null || !filename.contains(".")) return ".jpg";
        return filename.substring(filename.lastIndexOf("."));
    }
}