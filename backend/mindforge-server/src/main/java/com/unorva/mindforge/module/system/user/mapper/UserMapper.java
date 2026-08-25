package com.unorva.mindforge.module.system.user.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.unorva.mindforge.module.system.user.domain.entity.UserEntity;
import org.apache.ibatis.annotations.Mapper;

/**
 * 用户数据库映射接口
 *
 * @Author yanshijie
 * @Date 2026/8/26 00:09
 */
@Mapper
public interface UserMapper extends BaseMapper<UserEntity> {

}
