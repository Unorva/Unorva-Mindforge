package com.unorva.mindforge.common.security.login;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.jspecify.annotations.NullMarked;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.io.Serializable;
import java.util.Collection;
import java.util.List;

/**
 * @Author yanshijie
 * @Date 2026/8/30 22:15
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@NullMarked
public class LoginUser implements UserDetails, Serializable {

    private Long userId;

    private String username;

    private String password;

    private List<String> permissions;

    /**
     * 1. 获取用户权限
     */
    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        // 1. 检查权限是否为空
        if (permissions.isEmpty()) {
            return List.of();
        }
        // 2. 转换成 Spring Security 能识别的 List<SimpleGrantedAuthority> 权限对象。
        return permissions.stream()
                .map(SimpleGrantedAuthority::new)
                .toList();
    }

    /**
     * 2. 获取密码
     */
    @Override
    public String getPassword() {
        return this.password;
    }

    /**
     * 3. Spring Security 中虽然叫 username，
     * 但我们的系统使用邮箱作为登录标识
     */
    @Override
    public String getUsername() {
        return this.username;
    }

    /**
     * 4. 账号是否未过期
     */
    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    /**
     * 5. 账号是否未锁定
     */
    @Override
    public boolean isAccountNonLocked() {
        return true;
    }

    /**
     * 6. 密码是否未过期
     */
    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    /**
     * 7. 用户是否启用
     */
    @Override
    public boolean isEnabled() {
        return true;
    }
}
