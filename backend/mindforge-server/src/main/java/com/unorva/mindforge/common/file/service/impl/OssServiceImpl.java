package com.unorva.mindforge.common.file.service.impl;

import com.unorva.mindforge.common.file.service.FileService;
import lombok.RequiredArgsConstructor;
import org.springframework.util.Assert;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.CreateBucketRequest;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.HeadBucketRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.model.S3Exception;

import java.io.InputStream;

/**
 * 文件服务实现类
 *
 * @Author yanshijie
 * @Date 2026/8/31 16:38
 */
@RequiredArgsConstructor
public class OssServiceImpl implements FileService {

    /**
     * 对象存储客户端
     */
    private final S3Client s3Client;

    /**
     * 桶名称
     */
    private final String bucket;

    /**
     * 桶存在标识
     * 桶创建只在首次使用时检查一次，避免每次上传都额外发起 HeadBucket 请求。
     */
    private volatile boolean bucketReady;

    @Override
    public void upload(String objectKey, InputStream inputStream, long contentLength, String contentType) {
        // 1. 校验参数
        validateObjectKey(objectKey);
        Assert.notNull(inputStream, "文件输入流不能为空");
        Assert.isTrue(contentLength >= 0, "文件长度不能小于 0");
        // 2. 校验桶是否存在
        ensureBucketReady();
        PutObjectRequest request = PutObjectRequest.builder()
                .bucket(bucket)
                .key(objectKey)
                .contentType(contentType)
                .build();
        s3Client.putObject(request, RequestBody.fromInputStream(inputStream, contentLength));
    }

    @Override
    public void delete(String objectKey) {
        validateObjectKey(objectKey);
        ensureBucketReady();
        s3Client.deleteObject(DeleteObjectRequest.builder().bucket(bucket).key(objectKey).build());
    }

    /**
     * 确保桶存在。
     */
    private void ensureBucketReady() {
        if (bucketReady) {
            return;
        }
        synchronized (this) {
            if (bucketReady) {
                return;
            }
            try {
                s3Client.headBucket(HeadBucketRequest.builder().bucket(bucket).build());
            } catch (S3Exception exception) {
                if (!isBucketMissing(exception)) {
                    throw exception;
                }
                createBucketIfAbsent();
            }
            bucketReady = true;
        }
    }

    /**
     * 如果桶不存在，则创建桶。
     */
    private void createBucketIfAbsent() {
        try {
            s3Client.createBucket(CreateBucketRequest.builder().bucket(bucket).build());
        } catch (S3Exception exception) {
            // 另一个实例可能已经在当前实例创建前完成了建桶。
            if (exception.statusCode() != 409) {
                throw exception;
            }
        }
    }

    /**
     * 检查是否为桶不存在异常。
     *
     * @param exception S3 异常
     * @return 是否为桶不存在异常
     */
    private boolean isBucketMissing(S3Exception exception) {
        return exception.statusCode() == 404
                || (exception.awsErrorDetails() != null
                && "NoSuchBucket".equals(exception.awsErrorDetails().errorCode()));
    }

    /**
     * 校验对象 Key 是否符合要求。
     * @param objectKey 对象 Key
     */
    private void validateObjectKey(String objectKey) {
        Assert.hasText(objectKey, "对象 Key 不能为空");
        Assert.isTrue(!objectKey.startsWith("/"), "对象 Key 不能以 / 开头");
    }
}
