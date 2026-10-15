package com.unorva.mindforge.module.system.user.domain.form;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** 修改密码时必须验证原密码。 */
public record PasswordUpdateForm(
        @NotBlank(message = "原密码不能为空") @Size(max = 128, message = "原密码不能超过128个字符") String currentPassword,
        @NotBlank(message = "新密码不能为空") @Size(min = 8, max = 128, message = "新密码长度必须为8至128个字符") String newPassword) {}
