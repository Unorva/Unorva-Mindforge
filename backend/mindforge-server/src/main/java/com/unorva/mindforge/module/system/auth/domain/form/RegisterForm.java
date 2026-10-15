package com.unorva.mindforge.module.system.auth.domain.form;

import io.swagger.v3.oas.annotations.media.Schema;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * 注册表单参数
 *
 * @author yanshijie
 */
@Schema(name = "RegisterForm", description = "邮箱注册请求")
public record RegisterForm(

        /*
         * 昵称
         */
        @Schema(description = "昵称", example = "User123", requiredMode = Schema.RequiredMode.REQUIRED)
                @NotBlank(message = "昵称不能为空")
                @Size(max = 100, message = "昵称不能超过100个字符")
                String nickname,

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
                @Size(min = 8, max = 128, message = "密码长度必须为8至128个字符")
                String password) {}
