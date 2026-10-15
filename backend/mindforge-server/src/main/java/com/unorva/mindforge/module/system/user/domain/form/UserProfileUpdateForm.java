package com.unorva.mindforge.module.system.user.domain.form;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

/** 当前用户的个人资料更新请求。 */
public record UserProfileUpdateForm(
        @NotBlank(message = "昵称不能为空") @Size(max = 100, message = "昵称不能超过100个字符") String nickname,
        @NotBlank(message = "邮箱不能为空") @Email(message = "邮箱格式不正确") @Size(max = 100, message = "邮箱不能超过100个字符")
                String email,
        @Size(max = 32, message = "电话号码不能超过32个字符") @Pattern(regexp = "^$|^[+0-9() .-]{3,32}$", message = "电话号码格式不正确")
                String phone,
        @Size(max = 500, message = "头像地址不能超过500个字符") String avatar,
        @PositiveOrZero(message = "版本号不能为负数") Integer version) {}
