package com.unorva.mindforge.common.exception;

/**
*  系统异常
 *
 * @Author yanshijie
 * @Date 2026/8/25 11:03
 */
public class SystemException extends BaseException {

    public SystemException(ErrorCode errorCode) {
        super(errorCode);
    }

    public SystemException(String message, ErrorCode errorCode) {
        super(message, errorCode);
    }

    public SystemException(String message, Throwable cause, ErrorCode errorCode) {
        super(message, cause, errorCode);
    }

}
