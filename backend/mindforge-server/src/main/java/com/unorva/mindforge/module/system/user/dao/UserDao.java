package com.unorva.mindforge.module.system.user.dao;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.unorva.mindforge.module.system.user.domain.entity.UserEntity;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
@Mapper
public interface UserDao extends BaseMapper<UserEntity> {
    UserEntity selectByEmail(@Param("email") String email);
}
