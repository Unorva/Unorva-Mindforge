package com.unorva.mindforge.common.security.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.argon2.Argon2PasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

/**
 * 密码配置
 *
 * @Author yanshijie
 * @Date 2026/8/26 00:42
 */
@Configuration
public class PasswordConfig {

    @Bean
    public PasswordEncoder passwordEncoder() {
        /*
         * saltLength 盐长度：16 字节
         * hashLength 哈希长度：32 字节
         * parallelism 并行度：1
         * memory 内存：19 MiB，单位 KiB
         * iterations 迭代次数：2
         */
        return new Argon2PasswordEncoder(16, 32, 1, 19 * 1024, 2);
    }
}
