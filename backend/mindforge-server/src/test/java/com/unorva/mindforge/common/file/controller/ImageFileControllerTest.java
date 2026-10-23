package com.unorva.mindforge.common.file.controller;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import cn.dev33.satoken.context.SaHolder;
import cn.dev33.satoken.context.model.SaRequest;
import cn.dev33.satoken.exception.NotLoginException;
import cn.dev33.satoken.stp.StpUtil;

import com.unorva.mindforge.common.file.service.FileService;
import com.unorva.mindforge.common.file.service.ImageFileService;
import com.unorva.mindforge.common.file.service.ImageFileService.ImageDownload;
import com.unorva.mindforge.common.file.service.ImageFileService.ImageUpload;
import com.unorva.mindforge.common.security.config.SaTokenConfig;
import com.unorva.mindforge.common.security.support.CurrentUser;
import com.unorva.mindforge.common.web.handler.GlobalWebExceptionHandler;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.servlet.HandlerInterceptor;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;

import java.io.ByteArrayInputStream;
import java.util.List;

class ImageFileControllerTest {
    private final ImageFileService images = mock(ImageFileService.class);
    private final ImageFileController controller = new ImageFileController(images);

    @Test
    void multipartResponseIncludesStableMarkdownUrlAndImageMetadata() throws Exception {
        var file = new MockMultipartFile("file", "clipboard.png", "image/png", new byte[] {1, 2});
        String url = "/api/files/images/7/1234567890abcdef1234567890abcdef.png";
        when(images.upload(7L, file)).thenReturn(new ImageUpload(url, "clipboard.png", "image/png", 2));
        try (var currentUser = mockStatic(CurrentUser.class)) {
            currentUser.when(CurrentUser::id).thenReturn(7L);
            MockMvcBuilders.standaloneSetup(controller)
                    .build()
                    .perform(multipart("/api/files/images").file(file))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data.url").value(url))
                    .andExpect(jsonPath("$.data.size").value(2));
        }
    }

    @Test
    void readsBinaryWithPrivateCacheAndSniffingDisabled() throws Exception {
        String name = "1234567890abcdef1234567890abcdef.png";
        byte[] bytes = new byte[] {1, 2, 3};
        var input = spy(new ByteArrayInputStream(bytes));
        when(images.download(7L, 7L, name))
                .thenReturn(new ImageDownload(new FileService.Download(input, bytes.length), "image/png"));
        try (var currentUser = mockStatic(CurrentUser.class)) {
            currentUser.when(CurrentUser::id).thenReturn(7L);
            MockMvcBuilders.standaloneSetup(controller)
                    .build()
                    .perform(get("/api/files/images/7/" + name))
                    .andExpect(status().isOk())
                    .andExpect(content().contentType("image/png"))
                    .andExpect(content().bytes(bytes))
                    .andExpect(header().string("Cache-Control", "no-store"))
                    .andExpect(header().string("X-Content-Type-Options", "nosniff"));
            verify(images).download(7L, 7L, name);
            verify(input).close();
        }
    }

    @Test
    void headRequestAlsoClosesTheStorageStream() throws Exception {
        String name = "1234567890abcdef1234567890abcdef.png";
        var input = spy(new ByteArrayInputStream(new byte[] {1, 2, 3}));
        when(images.download(7L, 7L, name))
                .thenReturn(new ImageDownload(new FileService.Download(input, 3), "image/png"));
        try (var currentUser = mockStatic(CurrentUser.class)) {
            currentUser.when(CurrentUser::id).thenReturn(7L);
            MockMvcBuilders.standaloneSetup(controller)
                    .build()
                    .perform(head("/api/files/images/7/" + name))
                    .andExpect(status().isOk())
                    .andExpect(header().longValue("Content-Length", 3));
            verify(input).close();
        }
    }

    @Test
    void mapsStorageAndLimitFailuresToTheirHttpStatus() throws Exception {
        var file = new MockMultipartFile("file", "clipboard.png", "image/png", new byte[] {1, 2});
        var mvc =
                MockMvcBuilders.standaloneSetup(controller)
                        .setControllerAdvice(new GlobalWebExceptionHandler())
                        .build();
        try (var currentUser = mockStatic(CurrentUser.class)) {
            currentUser.when(CurrentUser::id).thenReturn(7L);
            when(images.upload(7L, file))
                    .thenThrow(new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "图片存储暂不可用"));
            mvc.perform(multipart("/api/files/images").file(file))
                    .andExpect(status().isServiceUnavailable())
                    .andExpect(jsonPath("$.success").value(false));
            doThrow(new MaxUploadSizeExceededException(10 * 1024 * 1024)).when(images).upload(7L, file);
            mvc.perform(multipart("/api/files/images").file(file))
                    .andExpect(status().isPayloadTooLarge())
                    .andExpect(jsonPath("$.message").value("图片不能超过 10 MB。"));
            when(images.download(7L, 99L, "missing.png"))
                    .thenThrow(new ResponseStatusException(HttpStatus.NOT_FOUND, "图片不存在或无权访问。"));
            mvc.perform(get("/api/files/images/99/missing.png")).andExpect(status().isNotFound());
        }
    }

    @Test
    void actualSecurityConfigurationProtectsBothUploadAndRead() throws Exception {
        var registry = new TestInterceptors();
        new SaTokenConfig().addInterceptors(registry);
        var mvc =
                MockMvcBuilders.standaloneSetup(controller)
                        .setControllerAdvice(new GlobalWebExceptionHandler())
                        .addInterceptors(registry.interceptors().toArray(HandlerInterceptor[]::new))
                        .build();
        var request = mock(SaRequest.class);
        when(request.getMethod()).thenReturn("GET");
        try (var holder = mockStatic(SaHolder.class);
                var login = mockStatic(StpUtil.class)) {
            holder.when(SaHolder::getRequest).thenReturn(request);
            login.when(StpUtil::checkLogin)
                    .thenThrow(new NotLoginException("login", NotLoginException.NOT_TOKEN, "未登录"));
            mvc.perform(get("/api/files/images/7/1234567890abcdef1234567890abcdef.png"))
                    .andExpect(status().isUnauthorized());
            when(request.getMethod()).thenReturn("POST");
            mvc.perform(multipart("/api/files/images").file(new MockMultipartFile("file", new byte[] {1})))
                    .andExpect(status().isUnauthorized());
            login.verify(StpUtil::checkLogin, times(2));
            verifyNoInteractions(images);
        }
    }

    @Test
    void missingMultipartFileReturnsBadRequest() throws Exception {
        MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new GlobalWebExceptionHandler())
                .build()
                .perform(multipart("/api/files/images"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false));
        verifyNoInteractions(images);
    }

    private static class TestInterceptors extends InterceptorRegistry {
        List<Object> interceptors() {
            return getInterceptors();
        }
    }
}
