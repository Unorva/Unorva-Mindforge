package com.unorva.mindforge.common.security.service;

import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.UUID;

/**
 * @Author yanshijie
 * @Date 2026/8/30 22:53
 */
@Service
@RequiredArgsConstructor
public class TokenService {

    /**
     * 登录状态缓存键前缀
     */
    private static final String LOGIN_KEY_PREFIX = "login:";

    /**
     * 只读写字符串，避免把 Spring Security 对象序列化到 Redis。
     */
    private final StringRedisTemplate stringRedisTemplate;

    /**
     * 创建 Token。
     */
    public String createToken(Long userId, boolean remember) {
        // 1. 生成 Token
        String token = UUID.randomUUID().toString().replace("-", "");
        String redisKey = LOGIN_KEY_PREFIX + token;
        // 2. 根据remember设置有效期
        Duration expiration = remember ? Duration.ofDays(30) : Duration.ofMinutes(30);
        // 3. Redis 仅保存稳定的用户标识
        stringRedisTemplate.opsForValue().set(redisKey, userId.toString(), expiration);
        // 4. 返回创建的 Token
        return token;
    }

    /**
     * 根据 Token 获取登录用户 ID。
     */
    public Long getUserId(String token) {
        if (token == null || token.isBlank()) {
            return null;
        }
        String redisKey = LOGIN_KEY_PREFIX + token;
        String userId = stringRedisTemplate.opsForValue().get(redisKey);
        if (userId == null) {
            return null;
        }
        return Long.valueOf(userId);
    }

    /**
     * 删除登录状态
     */
    public void deleteToken(String token) {
        if (token == null || token.isBlank()) {
            return;
        }
        stringRedisTemplate.delete(LOGIN_KEY_PREFIX + token);
    }
}
