package com.unorva.mindforge.common.security.utils;

import com.unorva.mindforge.common.security.login.LoginUser;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

/**
 * @Author yanshijie
 * @Date 2026/9/1 10:07
 */
public class SecurityUtil {

    /**
     * 获取当前登录用户
     */
    public static LoginUser getLoginUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated() || authentication.getPrincipal() instanceof String) {
            return null;
        }
        return (LoginUser) authentication.getPrincipal();
    }

    /**
     * 获取当前用户ID
     */
    public static Long getUserId() {
        LoginUser loginUser = getLoginUser();
        if (loginUser == null) {
            return null;
        }
        return loginUser.getUserId();
    }
}
