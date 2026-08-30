package com.unorva.mindforge.common.security.config;

import com.unorva.mindforge.common.security.filter.TokenAuthenticationFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.ProviderManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.UserDetailsService;
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
     * 密码编码器
     *
     * @return 密码编码器对象
     */
    @Bean
    public PasswordEncoder passwordEncoder() {
        /*
         * saltLength 盐长度：16 字节, hashLength 哈希长度：32 字节,parallelism 并行度：1, memory 内存：19 MiB，单位 KiB, iterations 迭代次数：2
         */
        return new Argon2PasswordEncoder(16, 32, 1, 19 * 1024, 2);
    }

    /**
     * 用户名密码认证提供者。
     */
    @Bean
    public DaoAuthenticationProvider daoAuthenticationProvider(UserDetailsService userDetailsService, PasswordEncoder passwordEncoder) {
        // 1. 创建认证提供者
        DaoAuthenticationProvider provider = new DaoAuthenticationProvider(userDetailsService);
        // 2. 设置密码编码器
        provider.setPasswordEncoder(passwordEncoder);
        return provider;
    }

    /**
     * 认证管理器。它负责把认证请求分派给能够处理该请求的 AuthenticationProvider。
     * 将来增加短信登录、Google 登录等方式时，可以继续添加对应 Provider，而不修改 AuthService 的调用方式。
     */
    @Bean
    public AuthenticationManager authenticationManager(DaoAuthenticationProvider daoAuthenticationProvider) {
        return new ProviderManager(daoAuthenticationProvider);
    }
}
