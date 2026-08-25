package com.unorva.mindforge.module.system.auth.domain.param;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

/**
 * 注册表单参数
 *
 * @Author yanshijie
 * @Date 2026/8/25 23:59
 */
@Schema(name = "RegisterParam", description = "邮箱注册请求")
public record RegisterParam(

        /*
         * 昵称
         */
        @Schema(description = "昵称", example = "User123", requiredMode = Schema.RequiredMode.REQUIRED)
        @NotBlank(message = "昵称不能为空")
        String nickname,

        /*
         * 邮箱
         */
        @Schema(description = "登录邮箱", example = "name@example.com", requiredMode = Schema.RequiredMode.REQUIRED)
        @NotBlank(message = "邮箱不能为空")
        @Email(message = "邮箱格式不正确")
        String email,

        /*
         * 密码
         */
        @Schema(description = "登录密码", example = "P@ssw0rd", requiredMode = Schema.RequiredMode.REQUIRED)
        @NotBlank(message = "密码不能为空")
        String password
) {

}
