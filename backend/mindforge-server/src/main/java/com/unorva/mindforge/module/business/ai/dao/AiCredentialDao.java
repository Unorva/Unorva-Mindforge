package com.unorva.mindforge.module.business.ai.dao;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.unorva.mindforge.module.business.ai.domain.entity.AiCredentialEntity;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface AiCredentialDao extends BaseMapper<AiCredentialEntity> {
    AiCredentialEntity find(@Param("userId") long userId);

    int save(@Param("userId") long userId, @Param("baseUrl") String baseUrl, @Param("ciphertext") String ciphertext);

    int remove(@Param("userId") long userId);
}
