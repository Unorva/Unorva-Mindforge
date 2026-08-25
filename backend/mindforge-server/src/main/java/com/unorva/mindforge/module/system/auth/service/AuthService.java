package com.unorva.mindforge.module.system.auth.service;

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
     * 密码加密
     */
    private final PasswordEncoder passwordEncoder;

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

    public LoginVO login(LoginParam loginParam) {
        // TODO 待实现
        return null;
    }
}
