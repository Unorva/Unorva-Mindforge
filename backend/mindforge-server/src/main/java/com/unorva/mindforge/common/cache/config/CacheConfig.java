package com.unorva.mindforge.common.cache.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.serializer.GenericJacksonJsonRedisSerializer;
import org.springframework.data.redis.serializer.StringRedisSerializer;

/**
 * 缓存配置类
 *
 * @Author yanshijie
 * @Date 2026/8/27 09:56
 */
@Configuration
public class CacheConfig {

    /**
     * 设置Redis序列化器: 解决Redis 里实际存进去的 Key/Value 可能是二进制形式，而不是你实际的key：
     * @param connectionFactory Redis 连接工厂
     * @return redis template
     */
    @Bean
    public RedisTemplate<String, Object> redisTemplate(RedisConnectionFactory connectionFactory) {
        RedisTemplate<String, Object> template = new RedisTemplate<>();
        // 1. 设置 Redis 连接工厂
        template.setConnectionFactory(connectionFactory);
        // 2. 配置 Key 和 HashKey 的序列化方式为 String
        StringRedisSerializer stringSerializer = new StringRedisSerializer();
        template.setKeySerializer(stringSerializer);
        template.setHashKeySerializer(stringSerializer);
        // 3. 配置 Value 和 HashValue 的序列化方式为 Jackson JSON
        GenericJacksonJsonRedisSerializer jsonSerializer = GenericJacksonJsonRedisSerializer.builder().build();
        template.setValueSerializer(jsonSerializer);
        template.setHashValueSerializer(jsonSerializer);
        // 4. 初始化 RedisTemplate 配置
        template.afterPropertiesSet();
        // 5. 返回配置完成的 RedisTemplate
        return template;
    }
}
