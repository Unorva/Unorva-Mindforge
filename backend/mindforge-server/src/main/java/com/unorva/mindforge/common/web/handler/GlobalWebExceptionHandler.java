package com.unorva.mindforge.common.web.handler;

import com.unorva.mindforge.common.exception.BaseException;
import com.unorva.mindforge.common.exception.BusinessException;
import com.unorva.mindforge.common.exception.SystemException;
import com.unorva.mindforge.common.web.response.ResponseCode;
import com.unorva.mindforge.common.web.vo.Result;
import lombok.extern.slf4j.Slf4j;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;

/**
 * 全局异常处理器
 *
 * @Author yanshijie
 * @Date 2026/8/25 10:54
 */
@Slf4j
@RestControllerAdvice
public class GlobalWebExceptionHandler {

    /**
     * 业务异常处理
     * @param exception 业务异常
     * @return 统一返回
     */
    @ExceptionHandler(BusinessException.class)
    public Result<?> handleBusinessException(BusinessException exception) {
        log.warn("Business exception occurred: {}", exception.getMessage(), exception);
        return failure(exception);
    }

    /**
     * 系统异常处理
     * @param exception 系统异常
     * @return 统一返回
     */
    @ExceptionHandler(SystemException.class)
    public Result<?> handleSystemException(SystemException exception) {
        log.error("System exception occurred.", exception);
        return failure(exception);
    }

    /**
     * 其他异常处理
     * @param exception 兜底异常
     * @return 统一返回
     */
    @ExceptionHandler(Exception.class)
    public Result<?> handleException(Exception exception) {
        log.error("Unexpected exception occurred.", exception);
        return Result.error(
                ResponseCode.SYSTEM_ERROR.getCode(),
                "哎呀，当前网络比较拥挤，请您稍后再试~"
        );
    }

    private Result<?> failure(BaseException exception) {
        String message = StringUtils.hasText(exception.getMessage())
                ? exception.getMessage()
                : exception.getErrorCode().getMessage();
        return Result.error(exception.getErrorCode().getCode(), message);
    }
}