package com.unorva.mindforge.module.system.user.manager;

import com.baomidou.mybatisplus.spring.service.impl.ServiceImpl;
import com.unorva.mindforge.module.system.user.domain.entity.UserEntity;
import com.unorva.mindforge.module.system.user.mapper.UserMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

/**
 * @Author yanshijie
 * @Date 2026/8/26 00:09
 */
@Service
@RequiredArgsConstructor
public class UserManager extends ServiceImpl<UserMapper, UserEntity> {

    private final UserMapper userMapper;


}
