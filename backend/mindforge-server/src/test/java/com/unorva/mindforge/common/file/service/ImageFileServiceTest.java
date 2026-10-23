package com.unorva.mindforge.common.file.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.support.StaticListableBeanFactory;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import software.amazon.awssdk.services.s3.model.S3Exception;

import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;

class ImageFileServiceTest {
    private static final byte[] PNG = new byte[] {(byte) 0x89, 'P', 'N', 'G', 13, 10, 26, 10, 0};
    private static final String FILE_NAME = "1234567890abcdef1234567890abcdef.png";
    private final FileService storage = mock(FileService.class);
    private final ImageFileService service =
            new ImageFileService(
                    new StaticListableBeanFactory(Map.of("storage", storage)).getBeanProvider(FileService.class));

    @Test
    void uploadsUnderOwnerWithStableUrlAndSniffedMimeInsteadOfClientFilename() throws Exception {
        doAnswer(
                        call -> {
                            assertEquals("image/png", call.getArgument(3));
                            assertEquals(PNG.length, (long) call.getArgument(2));
                            assertArrayEquals(PNG, ((java.io.InputStream) call.getArgument(1)).readAllBytes());
                            return null;
                        })
                .when(storage)
                .upload(anyString(), any(), anyLong(), anyString());

        var upload = service.upload(7L, new MockMultipartFile("file", "截图.txt", "text/plain", PNG));

        assertTrue(upload.url().matches("/api/files/images/7/[a-f0-9]{32}\\.png"));
        assertEquals("截图.txt", upload.name());
        assertEquals("image/png", upload.contentType());
        assertEquals(PNG.length, upload.size());
        verify(storage)
                .upload(
                        eq(upload.url().replace("/api/files/images/", "markdown-images/")),
                        any(),
                        eq((long) PNG.length),
                        eq("image/png"));
    }

    @Test
    void acceptsCommonClipboardRasterFormats() {
        for (var format :
                List.of(
                        new Format(new byte[] {(byte) 0xff, (byte) 0xd8, (byte) 0xff}, "jpeg", "jpg"),
                        new Format("GIF89a".getBytes(StandardCharsets.US_ASCII), "gif", "gif"),
                        new Format("RIFF0000WEBP".getBytes(StandardCharsets.US_ASCII), "webp", "webp"))) {
            var result = service.upload(7L, new MockMultipartFile("file", format.bytes()));
            assertEquals("image/" + format.mime(), result.contentType());
            assertTrue(result.url().endsWith("." + format.extension()));
        }
    }

    @Test
    void rejectsEmptySvgSpoofedMimeAndOversizedImagesBeforeTouchingStorage() throws Exception {
        var empty = new MockMultipartFile("file", new byte[0]);
        var svg =
                new MockMultipartFile(
                        "file",
                        "picture.png",
                        "image/png",
                        "<svg onload='alert(1)'/>".getBytes(StandardCharsets.UTF_8));
        assertEquals(
                HttpStatus.BAD_REQUEST,
                assertThrows(ResponseStatusException.class, () -> service.upload(7L, empty)).getStatusCode());
        assertEquals(
                HttpStatus.BAD_REQUEST,
                assertThrows(ResponseStatusException.class, () -> service.upload(7L, svg)).getStatusCode());

        MultipartFile oversized = mock(MultipartFile.class);
        when(oversized.getSize()).thenReturn((long) ImageFileService.MAX_IMAGE_BYTES + 1);
        assertEquals(
                HttpStatus.PAYLOAD_TOO_LARGE,
                assertThrows(ResponseStatusException.class, () -> service.upload(7L, oversized)).getStatusCode());
        verify(oversized, never()).getInputStream();

        MultipartFile lyingSize = mock(MultipartFile.class);
        when(lyingSize.getSize()).thenReturn(1L);
        when(lyingSize.getInputStream())
                .thenReturn(new ByteArrayInputStream(new byte[ImageFileService.MAX_IMAGE_BYTES + 1]));
        assertEquals(
                HttpStatus.PAYLOAD_TOO_LARGE,
                assertThrows(ResponseStatusException.class, () -> service.upload(7L, lyingSize)).getStatusCode());
        verifyNoInteractions(storage);
    }

    @Test
    void readsOnlyOwnedGeneratedKeysAndReturnsImageStream() throws Exception {
        var file = new FileService.Download(new ByteArrayInputStream(PNG), PNG.length);
        when(storage.download("markdown-images/7/" + FILE_NAME)).thenReturn(file);
        var image = service.download(7L, 7L, FILE_NAME);
        assertEquals("image/png", image.contentType());
        assertArrayEquals(PNG, image.file().inputStream().readAllBytes());
        assertEquals(PNG.length, image.file().contentLength());
    }

    @Test
    void deniesOtherOwnersAndTraversalWithoutFetchingObjects() {
        for (String file : List.of(FILE_NAME, "../../secret", "invalid.png", FILE_NAME + ".html")) {
            assertEquals(
                    HttpStatus.NOT_FOUND,
                    assertThrows(ResponseStatusException.class, () -> service.download(99L, 7L, file)).getStatusCode());
        }
        assertEquals(
                HttpStatus.NOT_FOUND,
                assertThrows(ResponseStatusException.class, () -> service.download(7L, 7L, "../" + FILE_NAME))
                        .getStatusCode());
        verifyNoInteractions(storage);
    }

    @Test
    void returnsActionableErrorsForMissingConfigurationMissingObjectAndStorageFailure() {
        var unavailable = new ImageFileService(new StaticListableBeanFactory().getBeanProvider(FileService.class));
        assertEquals(
                HttpStatus.SERVICE_UNAVAILABLE,
                assertThrows(
                                ResponseStatusException.class,
                                () -> unavailable.upload(7L, new MockMultipartFile("file", PNG)))
                        .getStatusCode());
        when(storage.download(anyString()))
                .thenThrow(S3Exception.builder().statusCode(404).message("secret endpoint").build());
        assertEquals(
                HttpStatus.NOT_FOUND,
                assertThrows(ResponseStatusException.class, () -> service.download(7L, 7L, FILE_NAME)).getStatusCode());
        doThrow(S3Exception.builder().statusCode(403).message("secret endpoint").build())
                .when(storage)
                .upload(anyString(), any(), anyLong(), anyString());
        var error =
                assertThrows(
                        ResponseStatusException.class, () -> service.upload(7L, new MockMultipartFile("file", PNG)));
        assertEquals(HttpStatus.SERVICE_UNAVAILABLE, error.getStatusCode());
        assertFalse(error.getReason().contains("secret endpoint"));
    }

    private record Format(byte[] bytes, String mime, String extension) {}
}
