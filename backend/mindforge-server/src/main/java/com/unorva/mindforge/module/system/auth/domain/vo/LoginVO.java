package com.unorva.mindforge.module.system.auth.domain.vo;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * 登录结果
 *
 * @author yanshijie
 */
@Schema(name = "LoginVO", description = "登录结果")
public record LoginVO(@Schema(description = "访问令牌") String token) {}
