package com.unorva.mindforge.common.security.config;

import com.unorva.mindforge.common.security.filter.TokenAuthenticationFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.argon2.Argon2PasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

/**
 * Web 安全配置
 */
@Configuration
@RequiredArgsConstructor
public class SecurityConfig {

    private final TokenAuthenticationFilter tokenAuthenticationFilter;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) {
        return http
                // 1. 前后端分离，不使用 CSRF
                .csrf(AbstractHttpConfigurer::disable)
                // 2. 不使用 Session
                .sessionManagement(session ->
                        session.sessionCreationPolicy(
                                SessionCreationPolicy.STATELESS
                        )
                )
                // 3. 授权请求
                .authorizeHttpRequests(authorize -> authorize
                        // 3.1 注册和登录接口无需认证
                        .requestMatchers(HttpMethod.POST, "/auth/register", "/auth/login").permitAll()
                        .requestMatchers("/v3/api-docs/**", "/swagger-ui/**", "/swagger-ui.html").permitAll()
                        // 3.2 其他请求都需要认证
                        .anyRequest().authenticated())
                // Token 过滤器
                .addFilterBefore(tokenAuthenticationFilter, UsernamePasswordAuthenticationFilter.class)
                .build();
    }

    /**
     * 密码加密器
     * @return 密码加密器对象
     */
    @Bean
    public PasswordEncoder passwordEncoder() {
        /*
         * saltLength 盐长度：16 字节, hashLength 哈希长度：32 字节,parallelism 并行度：1, memory 内存：19 MiB，单位 KiB, iterations 迭代次数：2
         */
        return new Argon2PasswordEncoder(16, 32, 1, 19 * 1024, 2);
    }

    /**
     * Spring Security 认证管理器
     */
    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration configuration) {
        return configuration.getAuthenticationManager();
    }
}
