package com.unorva.mindforge.module.system.auth.domain.param;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

/**
 * 登录表单参数
 *
 * @Author yanshijie
 * @Date 2026/8/25 12:51
 */
@Schema(name = "LoginParam", description = "邮箱登录请求")
public record LoginParam(

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
        String password,

        /*
         * 记住我
         */
        @Schema(description = "是否保持登录状态", example = "true")
        Boolean remember

) {

}
