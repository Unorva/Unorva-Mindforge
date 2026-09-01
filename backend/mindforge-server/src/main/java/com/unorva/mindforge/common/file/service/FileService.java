package com.unorva.mindforge.common.file.service;

import java.io.InputStream;

/**
 * 文件服务接口
 *
 * @Author yanshijie
 * @Date 2026/8/31 16:38
 */
public interface FileService {

    /**
     * 上传文件到默认存储桶。
     *
     * @param objectKey 对象 Key
     * @param inputStream 文件输入流
     * @param contentLength 文件字节数，S3 SDK 需要该值以避免缓冲整个文件
     * @param contentType MIME 类型，可为空
     */
    void upload(String objectKey, InputStream inputStream, long contentLength, String contentType);

    /**
     * 删除默认存储桶中的对象。
     *
     * @param objectKey 对象 Key
     */
    void delete(String objectKey);

}
