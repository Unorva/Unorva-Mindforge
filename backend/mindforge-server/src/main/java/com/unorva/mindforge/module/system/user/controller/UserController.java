package com.unorva.mindforge.module.system.user.controller;

import com.unorva.mindforge.common.security.support.CurrentUser;
import com.unorva.mindforge.common.web.vo.Result;
import com.unorva.mindforge.module.system.user.domain.form.PasswordUpdateForm;
import com.unorva.mindforge.module.system.user.domain.form.UserProfileUpdateForm;
import com.unorva.mindforge.module.system.user.domain.vo.UserProfileVO;
import com.unorva.mindforge.module.system.user.service.UserService;

import jakarta.validation.Valid;

import lombok.RequiredArgsConstructor;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

/** 当前用户资料及密码管理。 */
@RestController
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @GetMapping("/users/me")
    public Result<UserProfileVO> getProfile() {
        return Result.success(userService.getProfile(CurrentUser.id()));
    }

    @PutMapping("/users/me")
    public Result<UserProfileVO> updateProfile(@Valid @RequestBody UserProfileUpdateForm param) {
        return Result.success(userService.updateProfile(CurrentUser.id(), param));
    }

    @PutMapping("/users/me/password")
    public Result<Void> updatePassword(@Valid @RequestBody PasswordUpdateForm param) {
        userService.updatePassword(CurrentUser.id(), param);
        return Result.success();
    }
}
