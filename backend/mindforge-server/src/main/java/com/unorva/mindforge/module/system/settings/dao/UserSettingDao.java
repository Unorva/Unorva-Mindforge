package com.unorva.mindforge.module.system.settings.dao;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.unorva.mindforge.module.system.settings.domain.entity.UserSettingEntity;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface UserSettingDao extends BaseMapper<UserSettingEntity> {
    UserSettingEntity find(@Param("userId") long userId);

    int initialize(@Param("userId") long userId);

    Long lock(@Param("userId") long userId);

    int saveApps(@Param("userId") long userId, @Param("json") String json);

    int saveNotifications(@Param("userId") long userId, @Param("json") String json);

    int saveReports(@Param("userId") long userId, @Param("json") String json);

    int saveSecurity(@Param("userId") long userId, @Param("json") String json);
}
