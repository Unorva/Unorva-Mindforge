package com.unorva.mindforge.common.exception;

import lombok.AllArgsConstructor;
import lombok.Getter;

/**
 * @Author yanshijie
 * @Date 2026/8/25 11:04
 */
@AllArgsConstructor
@Getter
public enum RepositoryErrorCode implements ErrorCode {

    /**
     * 未知错误
     */
    UNKNOWN_ERROR(10000, "未知错误"),

    /**
     * 数据库插入失败
     */
    INSERT_FAILED(10001, "数据库插入失败"),

    /**
     * 数据库更新失败
     */
    UPDATE_FAILED(10002, "数据库更新失败");

    private final Integer code;

    private final String message;

}
