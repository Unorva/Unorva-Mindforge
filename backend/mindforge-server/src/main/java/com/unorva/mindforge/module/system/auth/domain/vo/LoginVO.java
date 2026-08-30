package com.unorva.mindforge.module.system.auth.domain.vo;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * 登录结果
 *
 * @Author yanshijie
 * @Date 2026/8/25 12:55
 */
@Schema(name = "LoginVO", description = "登录结果")
public record LoginVO(
        // TODO 后续根据需要扩展其他字段
        @Schema(description = "访问令牌")
        String token
) {
}