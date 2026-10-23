package com.unorva.mindforge.common.web.handler;

import cn.dev33.satoken.exception.NotLoginException;

import com.unorva.mindforge.common.exception.BaseException;
import com.unorva.mindforge.common.web.vo.Result;

import jakarta.validation.ConstraintViolationException;

import lombok.extern.slf4j.Slf4j;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.HandlerMethodValidationException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.multipart.support.MissingServletRequestPartException;
import org.springframework.web.server.ResponseStatusException;

import java.time.DateTimeException;

/** Returns consistent, actionable errors without exposing SQL, credentials or stack traces. */
@Slf4j
@RestControllerAdvice
public class GlobalWebExceptionHandler {

    @ExceptionHandler(NotLoginException.class)
    public ResponseEntity<Result<?>> handleNotLoggedIn(NotLoginException exception) {
        return error(HttpStatus.UNAUTHORIZED, "登录已失效，请重新登录。");
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Result<?>> handleValidation(MethodArgumentNotValidException exception) {
        String message =
                exception.getBindingResult().getFieldErrors().stream()
                        .map(field -> field.getDefaultMessage() == null ? "参数不符合要求" : field.getDefaultMessage())
                        .findFirst()
                        .orElse("参数不符合要求");
        return error(HttpStatus.BAD_REQUEST, message);
    }

    @ExceptionHandler({IllegalArgumentException.class, ConstraintViolationException.class})
    public ResponseEntity<Result<?>> handleInvalidArgument(Exception exception) {
        return error(
                HttpStatus.BAD_REQUEST,
                exception instanceof IllegalArgumentException ? exception.getMessage() : "参数不符合要求");
    }

    @ExceptionHandler({
        HttpMessageNotReadableException.class,
        HandlerMethodValidationException.class,
        DateTimeException.class,
        MethodArgumentTypeMismatchException.class,
        MissingServletRequestParameterException.class,
        MissingServletRequestPartException.class
    })
    public ResponseEntity<Result<?>> handleInvalidRequest(Exception exception) {
        return error(HttpStatus.BAD_REQUEST, "请求参数格式不正确，请检查后重试。");
    }

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<Result<?>> handleStatus(ResponseStatusException exception) {
        String message = StringUtils.hasText(exception.getReason()) ? exception.getReason() : "请求无法完成";
        return ResponseEntity.status(exception.getStatusCode())
                .body(Result.error(exception.getStatusCode().value(), message));
    }

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<Result<?>> handleUploadTooLarge(MaxUploadSizeExceededException exception) {
        return error(HttpStatus.PAYLOAD_TOO_LARGE, "图片不能超过 10 MB。");
    }

    @ExceptionHandler(BaseException.class)
    public Result<?> handleBusiness(BaseException exception) {
        String message =
                StringUtils.hasText(exception.getMessage())
                        ? exception.getMessage()
                        : exception.getErrorCode().getMessage();
        return Result.error(exception.getErrorCode().getCode(), message);
    }

    @ExceptionHandler({DataIntegrityViolationException.class, OptimisticLockingFailureException.class})
    public ResponseEntity<Result<?>> handleConflict(Exception exception) {
        log.warn("Data conflict: {}", exception.getClass().getSimpleName());
        return error(HttpStatus.CONFLICT, "数据已变更或记录已存在，请刷新后重试。");
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Result<?>> handleUnexpected(Exception exception) {
        log.error("Unexpected request failure", exception);
        return error(HttpStatus.INTERNAL_SERVER_ERROR, "服务暂时不可用，请稍后重试。");
    }

    private ResponseEntity<Result<?>> error(HttpStatus status, String message) {
        return ResponseEntity.status(status).body(Result.error(status.value(), message));
    }
}
