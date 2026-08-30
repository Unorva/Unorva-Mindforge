package com.unorva.mindforge.module.system.auth.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.unorva.mindforge.common.exception.BusinessException;
import com.unorva.mindforge.common.exception.RepositoryErrorCode;
import com.unorva.mindforge.common.security.login.LoginUser;
import com.unorva.mindforge.common.security.service.TokenService;
import com.unorva.mindforge.module.system.auth.domain.param.LoginParam;
import com.unorva.mindforge.module.system.auth.domain.param.RegisterParam;
import com.unorva.mindforge.module.system.auth.domain.vo.LoginVO;
import com.unorva.mindforge.module.system.auth.exception.AuthException;
import org.springframework.security.core.AuthenticationException;
import com.unorva.mindforge.module.system.user.domain.entity.UserEntity;
import com.unorva.mindforge.module.system.user.mapper.UserMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

/**
 * @Author yanshijie
 * @Date 2026/8/25 09:50
 */
@Service
@RequiredArgsConstructor
public class AuthService {

    /**
     * 用户Mapper
     */
    private final UserMapper userMapper;

    /**
     * 认证管理器
     */
    private final AuthenticationManager authenticationManager;

    /**
     * 密码加密
     */
    private final PasswordEncoder passwordEncoder;

    /**
     * 登录令牌服务
     */
    private final TokenService tokenService;

    /**
     * 用户注册
     * @param registerParam 注册参数
     */
    public void register(RegisterParam registerParam) {
        // 1. 检查邮箱是否存
        UserEntity userEntity = userMapper.selectOne(
                new LambdaQueryWrapper<UserEntity>()
                        .eq(UserEntity::getEmail, registerParam.email()));
        if (userEntity != null) {
            throw new BusinessException(AuthException.EMAIL_ALREADY_REGISTERED);
        }
        // 2. 密码加密
        String encodedPassword = passwordEncoder.encode(registerParam.password());
        // 3. 创建用户
        userEntity = new UserEntity();
        userEntity.setEmail(registerParam.email());
        userEntity.setPassword(encodedPassword);
        userEntity.setNickname(registerParam.nickname());
        if (userMapper.insert(userEntity) != 1) {
            throw new BusinessException(RepositoryErrorCode.INSERT_FAILED);
        }
    }

    /**
     * 用户登录
     * @param loginParam 登录参数
     * @return 登录返回信息
     */
    public LoginVO login(LoginParam loginParam) {
        // 1. 创建未认证的 Authentication
        UsernamePasswordAuthenticationToken authenticationToken = new UsernamePasswordAuthenticationToken(loginParam.email(), loginParam.password());
        // 2. 交给 Spring Security 执行认证
        Authentication authentication;
        try {
            authentication = authenticationManager.authenticate(authenticationToken);
        } catch (AuthenticationException exception) {
            throw new BusinessException(AuthException.EMAIL_OR_PASSWORD_ERROR);
        }
        // 3. 获取认证成功后的登录用户
        LoginUser loginUser = (LoginUser) authentication.getPrincipal();
        // 4. 检查是否需要记住登录状态 原因 防止 Boolean 值为 null 时的异常
        boolean remember = Boolean.TRUE.equals(loginParam.remember());
        // 4. 生成 Token，并保存登录状态到 Redis
        String token = tokenService.createToken(loginUser, remember);
        // 5. 返回 Token
        return new LoginVO(token);
    }
}
