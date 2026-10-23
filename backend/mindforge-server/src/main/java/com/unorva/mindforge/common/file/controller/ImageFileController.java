package com.unorva.mindforge.common.file.controller;

import com.unorva.mindforge.common.file.service.ImageFileService;
import com.unorva.mindforge.common.file.service.ImageFileService.ImageUpload;
import com.unorva.mindforge.common.security.support.CurrentUser;
import com.unorva.mindforge.common.web.vo.Result;

import lombok.RequiredArgsConstructor;

import org.springframework.core.io.InputStreamResource;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

/** 图片上传与读取均经过全局登录检查，不向浏览器暴露 RustFS 凭据或临时签名。 */
@RestController
@RequiredArgsConstructor
public class ImageFileController {
    private final ImageFileService images;

    @PostMapping(value = "/api/files/images", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public Result<ImageUpload> upload(@RequestParam("file") MultipartFile file) {
        return Result.success(images.upload(CurrentUser.id(), file));
    }

    @GetMapping("/api/files/images/{ownerId}/{fileName}")
    public ResponseEntity<InputStreamResource> download(@PathVariable long ownerId, @PathVariable String fileName) {
        var image = images.download(CurrentUser.id(), ownerId, fileName);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(image.contentType()))
                .contentLength(image.file().contentLength())
                .cacheControl(CacheControl.noStore())
                .header("X-Content-Type-Options", "nosniff")
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline")
                .body(new InputStreamResource(image.file().inputStream()));
    }
}
