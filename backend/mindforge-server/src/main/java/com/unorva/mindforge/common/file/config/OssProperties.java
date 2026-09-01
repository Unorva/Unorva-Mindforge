package com.unorva.mindforge.common.file.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

import jakarta.validation.constraints.NotBlank;

/**
 * 对象存储配置属性类
 *
 * @Author yanshijie
 * @Date 2026/8/31 16:39
 */
@Getter
@Setter
@Validated
@ConfigurationProperties(prefix = OssProperties.PREFIX)
public class OssProperties {

    public static final String PREFIX = "spring.oss";

    /**
     * 存储桶名称。业务方仅传对象 Key，不直接拼接桶名。
     */
    @NotBlank(message = "对象存储 bucket 不能为空")
    private String bucket;

    /**
     * S3 兼容服务地址，例如 <a href="http://localhost:9000">...</a>。
     */
    @NotBlank(message = "对象存储 endpoint 不能为空")
    private String endpoint;

    /**
     * S3 Access Key，由部署环境注入，不能写入代码仓库。
     */
    @NotBlank(message = "对象存储 access key 不能为空")
    private String accessKey;

    /**
     * S3 Secret Key，由部署环境注入，不能写入代码仓库。
     */
    @NotBlank(message = "对象存储 secret key 不能为空")
    private String secretKey;

    /**
     * RustFS 默认使用 us-east-1；保留配置项以兼容其他 S3 服务。
     */
    @NotBlank(message = "对象存储 region 不能为空")
    private String region = "us-east-1";

    /**
     * 本地 RustFS 默认使用 path-style URL，生产域名配置后可按需关闭。
     */
    private boolean pathStyle = true;

}
