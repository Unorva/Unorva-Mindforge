package com.unorva.mindforge.common.exception;

/**
 * 业务异常
 *
 * @Author yanshijie
 * @Date 2026/8/25 11:01
 */
public class BusinessException extends BaseException {

    public BusinessException(ErrorCode errorCode) {
        super(errorCode);
    }

    public BusinessException(String message, ErrorCode errorCode) {
        super(message, errorCode);
    }

    public BusinessException(String message, Throwable cause, ErrorCode errorCode) {
        super(message, cause, errorCode);
    }

}
