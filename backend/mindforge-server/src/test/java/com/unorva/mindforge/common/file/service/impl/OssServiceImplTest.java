package com.unorva.mindforge.common.file.service.impl;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import org.junit.jupiter.api.Test;

import software.amazon.awssdk.core.ResponseInputStream;
import software.amazon.awssdk.http.AbortableInputStream;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectResponse;
import software.amazon.awssdk.services.s3.model.S3Exception;

import java.io.ByteArrayInputStream;

class OssServiceImplTest {
    private final S3Client client = mock(S3Client.class);
    private final OssServiceImpl service = new OssServiceImpl(client, "mindforge");

    @Test
    void downloadsExactBucketKeyWithoutCreatingBucketAndPreservesStreamClose() throws Exception {
        byte[] bytes = new byte[] {1, 2, 3};
        var input = spy(new ByteArrayInputStream(bytes));
        var response =
                new ResponseInputStream<>(
                        GetObjectResponse.builder().contentLength(3L).build(), AbortableInputStream.create(input));
        when(client.getObject(any(GetObjectRequest.class))).thenReturn(response);

        var file = service.download("markdown-images/7/image.png");
        assertEquals(3L, file.contentLength());
        try (var stream = file.inputStream()) {
            assertArrayEquals(bytes, stream.readAllBytes());
        }
        verify(input).close();
        verify(client)
                .getObject(GetObjectRequest.builder().bucket("mindforge").key("markdown-images/7/image.png").build());
        verifyNoMoreInteractions(client);
    }

    @Test
    void preservesStorageFailureSoCallerCanMapHttpStatus() {
        var missing = S3Exception.builder().statusCode(404).build();
        when(client.getObject(any(GetObjectRequest.class))).thenThrow(missing);
        assertSame(missing, assertThrows(S3Exception.class, () -> service.download("missing.png")));
        assertThrows(IllegalArgumentException.class, () -> service.download("/invalid"));
    }
}
