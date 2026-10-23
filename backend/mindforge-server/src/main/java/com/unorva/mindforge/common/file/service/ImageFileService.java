package com.unorva.mindforge.common.file.service;

import lombok.RequiredArgsConstructor;

import org.springframework.beans.factory.ObjectProvider;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import software.amazon.awssdk.core.exception.SdkException;
import software.amazon.awssdk.services.s3.model.S3Exception;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.UUID;
import java.util.regex.Pattern;

/** Markdown 图片以稳定的业务地址保存，读取时仍校验图片所属用户。 */
@Service
@RequiredArgsConstructor
public class ImageFileService {
    public static final int MAX_IMAGE_BYTES = 10 * 1024 * 1024;
    private static final Pattern FILE_NAME = Pattern.compile("[a-f0-9]{32}\\.(png|jpg|gif|webp)");
    private final ObjectProvider<FileService> storage;

    public ImageUpload upload(long userId, MultipartFile file) {
        if (file.isEmpty()) throw invalid("请选择需要上传的图片。");
        if (file.getSize() > MAX_IMAGE_BYTES) throw tooLarge();
        byte[] bytes;
        try (var input = file.getInputStream()) {
            bytes = input.readNBytes(MAX_IMAGE_BYTES + 1);
        } catch (IOException exception) {
            throw invalid("无法读取图片，请重新选择后重试。");
        }
        if (bytes.length > MAX_IMAGE_BYTES) throw tooLarge();
        String extension = imageExtension(bytes);
        String fileName = UUID.randomUUID().toString().replace("-", "") + "." + extension;
        String contentType = contentType(extension);
        try {
            configuredStorage()
                    .upload(key(userId, fileName), new ByteArrayInputStream(bytes), bytes.length, contentType);
        } catch (SdkException exception) {
            throw unavailable();
        }
        String name = file.getOriginalFilename();
        return new ImageUpload(
                "/api/files/images/" + userId + "/" + fileName,
                name == null || name.isBlank() ? "image." + extension : name,
                contentType,
                bytes.length);
    }

    public ImageDownload download(long userId, long ownerId, String fileName) {
        if (userId != ownerId || !FILE_NAME.matcher(fileName).matches()) throw notFound();
        try {
            var file = configuredStorage().download(key(userId, fileName));
            return new ImageDownload(file, contentType(fileName.substring(fileName.lastIndexOf('.') + 1)));
        } catch (S3Exception exception) {
            if (exception.statusCode() == 404) throw notFound();
            throw unavailable();
        } catch (SdkException exception) {
            throw unavailable();
        }
    }

    private FileService configuredStorage() {
        var service = storage.getIfAvailable();
        if (service == null) throw unavailable();
        return service;
    }

    private static String key(long userId, String fileName) {
        return "markdown-images/" + userId + "/" + fileName;
    }

    private static String imageExtension(byte[] bytes) {
        // 不信任客户端 MIME/文件名，拒绝 SVG 和 HTML 等可执行内容。
        if (bytes.length >= 8
                && bytes[0] == (byte) 0x89
                && bytes[1] == 'P'
                && bytes[2] == 'N'
                && bytes[3] == 'G'
                && bytes[4] == 13
                && bytes[5] == 10
                && bytes[6] == 26
                && bytes[7] == 10) return "png";
        if (bytes.length >= 3 && bytes[0] == (byte) 0xff && bytes[1] == (byte) 0xd8 && bytes[2] == (byte) 0xff)
            return "jpg";
        if (bytes.length >= 6) {
            String header = new String(bytes, 0, 6, StandardCharsets.US_ASCII);
            if (header.equals("GIF87a") || header.equals("GIF89a")) return "gif";
        }
        if (bytes.length >= 12
                && new String(bytes, 0, 4, StandardCharsets.US_ASCII).equals("RIFF")
                && new String(bytes, 8, 4, StandardCharsets.US_ASCII).equals("WEBP")) return "webp";
        throw invalid("仅支持 PNG、JPEG、GIF 和 WebP 图片。");
    }

    private static String contentType(String extension) {
        return "image/" + (extension.equals("jpg") ? "jpeg" : extension);
    }

    private static ResponseStatusException invalid(String message) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
    }

    private static ResponseStatusException tooLarge() {
        return new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE, "图片不能超过 10 MB。");
    }

    private static ResponseStatusException notFound() {
        return new ResponseStatusException(HttpStatus.NOT_FOUND, "图片不存在或无权访问。");
    }

    private static ResponseStatusException unavailable() {
        return new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "图片存储暂不可用，请检查 RustFS 配置后重试。");
    }

    public record ImageUpload(String url, String name, String contentType, long size) {}

    public record ImageDownload(FileService.Download file, String contentType) {}
}
