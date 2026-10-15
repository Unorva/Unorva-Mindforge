package com.unorva.mindforge.module.system.auth.domain.form;

import io.swagger.v3.oas.annotations.media.Schema;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * 登录表单参数
 *
 * @author yanshijie
 */
@Schema(name = "LoginForm", description = "邮箱登录请求")
public record LoginForm(

        /*
         * 邮箱
         */
        @Schema(description = "登录邮箱", example = "name@example.com", requiredMode = Schema.RequiredMode.REQUIRED)
                @NotBlank(message = "邮箱不能为空")
                @Email(message = "邮箱格式不正确")
                @Size(max = 100, message = "邮箱不能超过100个字符")
                String email,

        /*
         * 密码
         */
        @Schema(description = "登录密码", example = "P@ssw0rd", requiredMode = Schema.RequiredMode.REQUIRED)
                @NotBlank(message = "密码不能为空")
                @Size(max = 128, message = "密码不能超过128个字符")
                String password,

        /*
         * 记住我
         */
        @Schema(description = "是否保持登录状态", example = "true") Boolean remember) {}
