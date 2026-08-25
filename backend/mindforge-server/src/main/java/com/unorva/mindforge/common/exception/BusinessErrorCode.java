package com.unorva.mindforge.common.exception;

import lombok.AllArgsConstructor;
import lombok.Getter;

/**
 * 业务异常码枚举
 *
 * @Author yanshijie
 * @Date 2026/8/25 10:59
 */
@Getter
@AllArgsConstructor
public enum BusinessErrorCode implements ErrorCode {

    ;

    private final String code;

    private final String message;
}
