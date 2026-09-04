package com.unorva.mindforge.module.system.auth.service;

import cn.dev33.satoken.stp.StpUtil;
import cn.dev33.satoken.stp.parameter.SaLoginParameter;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.unorva.mindforge.common.exception.BusinessException;
import com.unorva.mindforge.common.exception.RepositoryErrorCode;
import com.unorva.mindforge.module.system.auth.domain.param.LoginParam;
import com.unorva.mindforge.module.system.auth.domain.param.RegisterParam;
import com.unorva.mindforge.module.system.auth.domain.vo.LoginVO;
import com.unorva.mindforge.module.system.auth.exception.AuthException;
import com.unorva.mindforge.module.system.user.domain.entity.UserEntity;
import com.unorva.mindforge.module.system.user.mapper.UserMapper;
import lombok.RequiredArgsConstructor;
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
     * 密码
     */
    private final PasswordEncoder passwordEncoder;

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
        UserEntity userEntity = userMapper.selectOne(
                new LambdaQueryWrapper<UserEntity>()
                        .eq(UserEntity::getEmail, loginParam.email())
        );
        if (userEntity == null || !passwordEncoder.matches(loginParam.password(), userEntity.getPassword())) {
            throw new BusinessException(AuthException.EMAIL_OR_PASSWORD_ERROR);
        }
        // 按“记住我”分别设置会话有效期，前端继续使用 Authorization: Bearer 传递令牌。
        boolean remember = Boolean.TRUE.equals(loginParam.remember());
        long timeout = remember ? 30L * 24 * 60 * 60 : 30L * 60;
        StpUtil.login(userEntity.getId(), SaLoginParameter.create()
                .setTimeout(timeout)
                .setIsLastingCookie(false));
        return new LoginVO(StpUtil.getTokenValue());
    }
}
