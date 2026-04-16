package com.bookish.bookish.controller;

import com.bookish.bookish.dto.response.CustomerResponse;
import com.bookish.bookish.service.AvatarService;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;

@RestController
@RequestMapping("/users")
public class AvatarController {

    private final AvatarService avatarService;

    public AvatarController(AvatarService avatarService) {
        this.avatarService = avatarService;
    }

    /**
     * PUT /users/{id}/avatar
     * Upload hoặc thay đổi ảnh đại diện — gửi file qua multipart/form-data, field tên "file"
     */
    @PutMapping(value = "/{id}/avatar", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public CustomerResponse uploadAvatar(@PathVariable Integer id,
                                         @RequestParam("file") MultipartFile file) throws IOException {
        return avatarService.uploadAvatar(id, file);
    }

    /**
     * DELETE /users/{id}/avatar
     * Xóa ảnh đại diện, avatarUrl trong DB sẽ thành null
     */
    @DeleteMapping("/{id}/avatar")
    public ResponseEntity<Void> deleteAvatar(@PathVariable Integer id) {
        avatarService.deleteAvatar(id);
        return ResponseEntity.noContent().build();
    }
}