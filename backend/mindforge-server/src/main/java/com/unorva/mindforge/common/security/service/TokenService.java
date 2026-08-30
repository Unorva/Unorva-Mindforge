package com.unorva.mindforge.common.security.service;

import com.unorva.mindforge.common.security.login.LoginUser;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.RedisTemplate;
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
     * 登录状态缓存有效期（分钟）
     */
    private static final long EXPIRE_TIME = 30;

    /**
     * Redis 模板
     */
    private final RedisTemplate<String, Object> redisTemplate;

    /**
     * 创建 Token UUID 版本
     */
    public String createToken(LoginUser loginUser, boolean remember) {
        // 生成 Token
        String token = UUID.randomUUID().toString().replace("-", "");
        String redisKey = LOGIN_KEY_PREFIX + token;
        // 根据remember设置有效期
        Duration expiration = remember ? Duration.ofDays(30) : Duration.ofMinutes(30);
        // 保存登录用户并设置有效期
        redisTemplate.opsForValue().set(redisKey, loginUser, expiration);
        // 返回创建的 Token
        return token;
    }

    /**
     * 根据 Token 获取登录用户
     */
    public LoginUser getLoginUser(String token) {
        if (token == null || token.isBlank()) {
            return null;
        }
        String redisKey = LOGIN_KEY_PREFIX + token;
        Object value = redisTemplate.opsForValue().get(redisKey);
        if (value == null) {
            return null;
        }
        return (LoginUser) value;
    }

    /**
     * 删除登录状态
     */
    public void deleteToken(String token) {
        if (token == null || token.isBlank()) {
            return;
        }
        redisTemplate.delete(LOGIN_KEY_PREFIX + token);
    }

    /**
     * 刷新 Token 有效期
     */
    public void refreshToken(String token) {
        if (token == null || token.isBlank()) {
            return;
        }
        redisTemplate.expire(LOGIN_KEY_PREFIX + token, Duration.ofMinutes(EXPIRE_TIME));
    }
}
