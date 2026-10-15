package com.unorva.mindforge.module.system.auth.service;


import com.unorva.mindforge.common.exception.BusinessException;
import com.unorva.mindforge.common.exception.RepositoryErrorCode;
import com.unorva.mindforge.module.system.auth.domain.form.LoginForm;
import com.unorva.mindforge.module.system.auth.domain.form.RegisterForm;
import com.unorva.mindforge.module.system.auth.domain.vo.LoginVO;
import com.unorva.mindforge.module.system.auth.manager.AuthManager;
import com.unorva.mindforge.module.system.auth.exception.AuthException;
import com.unorva.mindforge.module.system.user.domain.entity.UserEntity;
import com.unorva.mindforge.module.system.user.dao.UserDao;

import lombok.RequiredArgsConstructor;

import org.springframework.dao.DuplicateKeyException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Locale;

/**
 * @author yanshijie
 */
@Service
@RequiredArgsConstructor
public class AuthService {

    /** 用户数据访问 */
    private final UserDao userDao;
    private final AuthManager authManager;

    /** 密码 */
    private final PasswordEncoder passwordEncoder;

    /**
     * 用户注册
     *
     * @param registerParam 注册参数
     */
    public void register(RegisterForm registerParam) {
        validateRegistration(registerParam);
        String email = normalizeEmail(registerParam.email());
        // 检查邮箱是否已注册
        UserEntity userEntity =
                userDao.selectByEmail(email);
        if (userEntity != null) {
            throw new BusinessException(AuthException.EMAIL_ALREADY_REGISTERED);
        }
        // 2. 密码加密
        String encodedPassword = passwordEncoder.encode(registerParam.password());
        // 3. 创建用户
        userEntity = new UserEntity();
        userEntity.setEmail(email);
        userEntity.setPassword(encodedPassword);
        userEntity.setNickname(registerParam.nickname().trim());
        try {
            if (userDao.insert(userEntity) != 1) {
                throw new BusinessException(RepositoryErrorCode.INSERT_FAILED);
            }
        } catch (DuplicateKeyException exception) {
            // 数据库唯一索引解决两个注册请求同时通过查询校验的竞态。
            throw new BusinessException(AuthException.EMAIL_ALREADY_REGISTERED);
        }
    }

    /**
     * 用户登录
     *
     * @param loginParam 登录参数
     * @return 登录返回信息
     */
    public LoginVO login(LoginForm loginParam) {
        if (loginParam == null
                || loginParam.email() == null
                || loginParam.password() == null
                || loginParam.password().isBlank()
                || loginParam.password().length() > 128) {
            throw new BusinessException(AuthException.EMAIL_OR_PASSWORD_ERROR);
        }
        UserEntity userEntity =
                userDao.selectByEmail(normalizeEmail(loginParam.email()));
        if (userEntity == null || !passwordEncoder.matches(loginParam.password(), userEntity.getPassword())) {
            throw new BusinessException(AuthException.EMAIL_OR_PASSWORD_ERROR);
        }
        return authManager.createSession(userEntity.getId(), Boolean.TRUE.equals(loginParam.remember()));
    }

    public void logout(String token) { authManager.logout(token); }

    private String normalizeEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }

    private void validateRegistration(RegisterForm param) {
        if (param == null
                || param.nickname() == null
                || param.nickname().isBlank()
                || param.nickname().length() > 100
                || param.email() == null
                || param.email().isBlank()
                || param.email().length() > 100
                || param.password() == null
                || param.password().isBlank()
                || param.password().length() < 8
                || param.password().length() > 128) {
            throw new BusinessException("注册信息不完整或长度不符合要求", RepositoryErrorCode.UPDATE_FAILED);
        }
    }
}
