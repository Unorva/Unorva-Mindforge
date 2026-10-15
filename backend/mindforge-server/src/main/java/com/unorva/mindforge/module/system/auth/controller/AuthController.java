package com.unorva.mindforge.module.system.auth.controller;

import cn.dev33.satoken.stp.StpUtil;

import com.unorva.mindforge.common.web.vo.Result;
import com.unorva.mindforge.module.system.auth.domain.form.LoginForm;
import com.unorva.mindforge.module.system.auth.domain.form.RegisterForm;
import com.unorva.mindforge.module.system.auth.domain.vo.LoginVO;
import com.unorva.mindforge.module.system.auth.service.AuthService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

import jakarta.validation.Valid;

import lombok.RequiredArgsConstructor;

import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

/**
 * @author yanshijie
 */
@Tag(name = "认证", description = "登录、退出和令牌相关接口")
@RestController
@RequiredArgsConstructor
public class AuthController {

    /** 登录服务 */
    private final AuthService authService;

    /**
     * 用户注册
     *
     * @param registerParam 注册参数
     * @return 注册结果
     */
    @PostMapping("/auth/register")
    @Operation(summary = "邮箱注册", description = "使用邮箱和密码注册；成功后返回注册结果。")
    public Result<Void> register(@Valid @RequestBody RegisterForm registerParam) {
        authService.register(registerParam);
        return Result.success();
    }

    /**
     * 用户登录
     *
     * @param loginParam 登录参数
     * @return 登录返回信息
     */
    @Operation(summary = "邮箱登录", description = "使用邮箱和密码登录；成功后返回用户会话信息。")
    @PostMapping("/auth/login")
    public Result<LoginVO> login(@Valid @RequestBody LoginForm loginParam) {
        return Result.success(authService.login(loginParam));
    }

    /** 用户退出登录 */
    @PostMapping("/auth/logout")
    @Operation(summary = "退出登录", description = "使当前 Bearer Token 立即失效。")
    public Result<Void> logout() {
        authService.logout(StpUtil.getTokenValue());
        return Result.success();
    }
}
