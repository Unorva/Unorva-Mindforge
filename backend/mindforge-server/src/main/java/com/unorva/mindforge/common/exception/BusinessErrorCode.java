package com.unorva.mindforge.common.exception;

import lombok.AllArgsConstructor;
import lombok.Getter;

/** 业务异常码枚举 @Author yanshijie @Date 2026/8/25 10:59 */
@Getter
@AllArgsConstructor
public enum BusinessErrorCode implements ErrorCode {
    INVALID_INPUT(4000, "参数不符合要求"),
    NOT_FOUND(4004, "记录不存在或无权访问"),
    CONFLICT(4009, "记录状态冲突"),
    NOT_CONFIGURED(5030, "服务尚未配置"),
    PROVIDER_FAILED(5031, "外部服务调用失败，请检查配置或稍后重试");

    private final Integer code;

    private final String message;
}
