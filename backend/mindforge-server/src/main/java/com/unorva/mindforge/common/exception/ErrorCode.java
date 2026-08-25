package com.unorva.mindforge.common.exception;

/**
 * @Author yanshijie
 * @Date 2026/8/25 10:58
 */
public interface ErrorCode {

    /**
     * 错误码
     *
     * @return 错误码
     */
    Integer getCode();

    /**
     * 错误信息
     *
     * @return 错误信息
     */
    String getMessage();

}
