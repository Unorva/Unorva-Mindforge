package com.unorva.mindforge.module.system.login.controller;

import com.unorva.mindforge.common.web.vo.Result;
import com.unorva.mindforge.module.system.login.domain.param.LoginParam;
import com.unorva.mindforge.module.system.login.domain.vo.LoginVO;
import com.unorva.mindforge.module.system.login.service.LoginService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
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
@RequestMapping("/login")
@RequiredArgsConstructor
public class LoginController {

    /**
     * 登录服务
     */
    private final LoginService loginService;

    /**
     * 用户登录
     * @param loginParam 登录参数
     * @return 登录返回信息
     */
    @Operation(summary = "邮箱登录", description = "使用邮箱和密码登录；成功后返回用户会话信息。")
    @PostMapping
    public Result<LoginVO> login(@Valid @RequestBody LoginParam loginParam){
        return Result.success(loginService.login(loginParam));
    }



}
