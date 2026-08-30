package com.unorva.mindforge.common.security.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.unorva.mindforge.common.security.login.LoginUser;
import com.unorva.mindforge.module.system.user.domain.entity.UserEntity;
import com.unorva.mindforge.module.system.user.mapper.UserMapper;
import lombok.RequiredArgsConstructor;
import org.jspecify.annotations.NullMarked;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * @Author yanshijie
 * @Date 2026/8/30 22:29
 */
@Service
@RequiredArgsConstructor
@NullMarked
public class UserDetailsServiceImpl implements UserDetailsService {

    private final UserMapper userMapper;

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        UserEntity user = userMapper.selectOne(
                new LambdaQueryWrapper<UserEntity>()
                        .eq(UserEntity::getEmail, username)
        );
        if (user == null) {
            throw new UsernameNotFoundException("用户名或密码错误");
        }
        // TODO 暂时写死权限(后续根据角色动态获取)
        List<String> permissions = List.of(
                "user:list",
                "user:add",
                "user:update"
        );
        return new LoginUser(user, permissions);
    }

}
