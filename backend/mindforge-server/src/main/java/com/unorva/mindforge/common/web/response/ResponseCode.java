package com.unorva.mindforge.common.web.response;

import lombok.AllArgsConstructor;
import lombok.Getter;

/**
 * @Author yanshijie
 * @Date 2026/8/25 11:15
 */
@Getter
@AllArgsConstructor
public enum ResponseCode {

    SUCCESS(0, "操作成功"),

    DUPLICATED(1, "重复"),

    ILLEGAL_ARGUMENT(2, "非法参数"),

    SYSTEM_ERROR(3, "系统错误"),

    BUSINESS_ERROR(4, "业务错误");

    private final Integer code;

    private final String message;
}
