package com.unorva.mindforge.module.system.auth.exception;

import com.unorva.mindforge.common.exception.ErrorCode;
import lombok.AllArgsConstructor;
import lombok.Getter;

/**
 * @Author yanshijie
 * @Date 2026/8/26 00:16
 */
@Getter
@AllArgsConstructor
public enum AuthException implements ErrorCode {

    EMAIL_ALREADY_REGISTERED(10001, "该邮箱已注册"),

    EMAIL_OR_PASSWORD_ERROR(10002, "邮箱或密码错误");

    private final Integer code;

    private final String message;
}
