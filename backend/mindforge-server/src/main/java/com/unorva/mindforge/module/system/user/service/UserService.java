package com.unorva.mindforge.module.system.user.service;


import com.unorva.mindforge.common.exception.BusinessException;
import com.unorva.mindforge.common.exception.RepositoryErrorCode;
import com.unorva.mindforge.module.system.user.domain.entity.UserEntity;
import com.unorva.mindforge.module.system.user.domain.form.PasswordUpdateForm;
import com.unorva.mindforge.module.system.user.domain.form.UserProfileUpdateForm;
import com.unorva.mindforge.module.system.user.domain.vo.UserProfileVO;
import com.unorva.mindforge.module.system.user.dao.UserDao;
import com.unorva.mindforge.module.system.user.manager.UserManager;

import lombok.RequiredArgsConstructor;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.URISyntaxException;
import java.util.Locale;
import java.util.Objects;

/** 用户资料只允许当前登录用户读取和修改。 */
@Service
@RequiredArgsConstructor
public class UserService {

    private final UserDao userDao;
    private final UserManager userManager;
    private final PasswordEncoder passwordEncoder;

    public UserProfileVO getProfile(long userId) {
        return toProfileVO(getUser(userId));
    }

    public UserProfileVO updateProfile(long userId, UserProfileUpdateForm param) {
        UserEntity user = getUser(userId);
        if (param.version() != null && !Objects.equals(param.version(), user.getVersion())) {
            throw new BusinessException("个人资料已被修改，请刷新后重试", RepositoryErrorCode.UPDATE_FAILED);
        }
        validateAvatar(param.avatar());
        user.setNickname(param.nickname().trim());
        user.setEmail(param.email().trim().toLowerCase(Locale.ROOT));
        user.setPhone(trimToNull(param.phone()));
        user.setAvatar(trimToNull(param.avatar()));
        userManager.saveProfile(user);
        return toProfileVO(user);
    }

    public void updatePassword(long userId, PasswordUpdateForm param) {
        UserEntity user = getUser(userId);
        if (!passwordEncoder.matches(param.currentPassword(), user.getPassword())) {
            throw new BusinessException("原密码不正确", RepositoryErrorCode.UPDATE_FAILED);
        }
        if (param.newPassword() == null
                || param.newPassword().isBlank()
                || param.newPassword().length() < 8
                || param.newPassword().length() > 128) {
            throw new BusinessException("新密码长度必须为8至128个字符", RepositoryErrorCode.UPDATE_FAILED);
        }
        if (Objects.equals(param.currentPassword(), param.newPassword())) {
            throw new BusinessException("新密码不能与原密码相同", RepositoryErrorCode.UPDATE_FAILED);
        }
        user.setPassword(passwordEncoder.encode(param.newPassword()));
        userManager.savePassword(user);
    }

    private UserEntity getUser(long userId) {
        UserEntity user = userDao.selectById(userId);
        if (user == null) {
            throw new BusinessException("当前用户不存在，请重新登录", RepositoryErrorCode.UNKNOWN_ERROR);
        }
        return user;
    }

    private void validateAvatar(String avatar) {
        if (avatar == null || avatar.isBlank()) {
            return;
        }
        try {
            URI uri = new URI(avatar.trim());
            if ((!"https".equalsIgnoreCase(uri.getScheme()) && !"http".equalsIgnoreCase(uri.getScheme()))
                    || uri.getHost() == null
                    || uri.getUserInfo() != null) {
                throw new BusinessException("头像必须使用有效的HTTP或HTTPS地址", RepositoryErrorCode.UPDATE_FAILED);
            }
        } catch (URISyntaxException exception) {
            throw new BusinessException("头像地址格式不正确", RepositoryErrorCode.UPDATE_FAILED);
        }
    }

    private UserProfileVO toProfileVO(UserEntity user) {
        return new UserProfileVO(
                user.getId(),
                user.getNickname(),
                user.getEmail(),
                user.getPhone(),
                user.getAvatar(),
                user.getVersion());
    }

    private String trimToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
