package com.unorva.mindforge.module.system.auth.controller;

import com.unorva.mindforge.common.security.service.TokenService;
import com.unorva.mindforge.common.web.vo.Result;
import com.unorva.mindforge.module.system.auth.domain.param.LoginParam;
import com.unorva.mindforge.module.system.auth.domain.param.RegisterParam;
import com.unorva.mindforge.module.system.auth.domain.vo.LoginVO;
import com.unorva.mindforge.module.system.auth.service.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * @Author yanshijie
 * @Date 2026/8/25 09:49
 */
@Tag(name = "认证", description = "登录、退出和令牌相关接口")
@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {

    /**
     * 登录服务
     */
    private final AuthService authService;

    /**
     * 登录令牌服务
     */
    private final TokenService tokenService;

    /**
     * 用户注册
     * @param registerParam 注册参数
     * @return 注册结果
     */
    @PostMapping("/register")
    @Operation(summary = "邮箱注册", description = "使用邮箱和密码注册；成功后返回注册结果。")
    public Result<Void> register(@Valid @RequestBody RegisterParam registerParam){
        authService.register(registerParam);
        return Result.success();
    }

    /**
     * 用户登录
     * @param loginParam 登录参数
     * @return 登录返回信息
     */
    @Operation(summary = "邮箱登录", description = "使用邮箱和密码登录；成功后返回用户会话信息。")
    @PostMapping("/login")
    public Result<LoginVO> login(@Valid @RequestBody LoginParam loginParam){
        return Result.success(authService.login(loginParam));
    }

    /**
     * 用户退出登录
     * @param request Http请求
     */
    @PostMapping("/logout")
    public void logout(HttpServletRequest request) {
        String authorization = request.getHeader("Authorization");
        if (authorization == null || !authorization.startsWith("Bearer ")) {
            return;
        }
        String token = authorization.substring(7);
        tokenService.deleteToken(token);
    }
}
