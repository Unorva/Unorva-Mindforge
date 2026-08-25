package com.unorva.mindforge.common.exception;

import lombok.AllArgsConstructor;
import lombok.Getter;

/**
 * 系统异常码枚举
 *
 * @Author yanshijie
 * @Date 2026/8/25 11:00
 */
@AllArgsConstructor
@Getter
public enum SystemErrorCode implements ErrorCode {

    ;

    private final String code;

    private final String message;
}
