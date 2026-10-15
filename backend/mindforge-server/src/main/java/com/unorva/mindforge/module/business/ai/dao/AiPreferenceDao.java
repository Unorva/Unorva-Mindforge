package com.unorva.mindforge.module.business.ai.dao;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.unorva.mindforge.module.business.ai.domain.entity.AiPreferenceEntity;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface AiPreferenceDao extends BaseMapper<AiPreferenceEntity> {
    String findJson(@Param("userId") long userId);

    int save(@Param("userId") long userId, @Param("json") String json);
}
