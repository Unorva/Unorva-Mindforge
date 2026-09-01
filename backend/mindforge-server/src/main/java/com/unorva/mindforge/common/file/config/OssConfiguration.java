package com.unorva.mindforge.common.file.config;

import com.unorva.mindforge.common.file.service.FileService;
import com.unorva.mindforge.common.file.service.impl.OssServiceImpl;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.S3Configuration;

import java.net.URI;

/**
 * 对象存储配置类
 *
 * @Author yanshijie
 * @Date 2026/8/31 16:38
 */
@Configuration
@ConditionalOnProperty(prefix = OssProperties.PREFIX, name = "endpoint")
@EnableConfigurationProperties(OssProperties.class)
public class OssConfiguration {

    /**
     * 创建一个应用级 S3 客户端。S3Client 是线程安全的，不能在每次上传时重复创建。
     */
    @Bean(destroyMethod = "close")
    @ConditionalOnMissingBean
    public S3Client s3Client(OssProperties ossProperties) {
        return S3Client.builder()
                .endpointOverride(URI.create(ossProperties.getEndpoint()))
                .region(Region.of(ossProperties.getRegion()))
                .credentialsProvider(StaticCredentialsProvider.create(
                        AwsBasicCredentials.create(ossProperties.getAccessKey(), ossProperties.getSecretKey())
                ))
                // RustFS 的本地部署默认不配置泛域名，因此使用 path-style URL。
                .serviceConfiguration(S3Configuration.builder()
                        .pathStyleAccessEnabled(ossProperties.isPathStyle())
                        .build())
                .build();
    }

    /**
     * 注册对象存储对外服务
     *
     * @return 对象存储服务
     */
    @Bean
    @ConditionalOnMissingBean
    public FileService ossService(S3Client s3Client, OssProperties ossProperties) {
        return new OssServiceImpl(s3Client, ossProperties.getBucket());
    }

}
