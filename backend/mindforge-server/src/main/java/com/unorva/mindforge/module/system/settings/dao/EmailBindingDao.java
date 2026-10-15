package com.unorva.mindforge.module.system.settings.dao;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.unorva.mindforge.module.system.settings.domain.entity.EmailBindingEntity;
import com.unorva.mindforge.module.system.settings.domain.vo.EmailBindingVO;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface EmailBindingDao extends BaseMapper<EmailBindingEntity> {
    long count(@Param("userId") long userId);

    long countOwned(@Param("userId") long userId, @Param("id") long id);

    int bind(EmailBindingEntity entity);

    int primary(@Param("userId") long userId, @Param("id") long id);

    Boolean isPrimary(@Param("userId") long userId, @Param("id") long id);

    int unbind(@Param("userId") long userId, @Param("id") long id);

    List<EmailBindingVO> list(@Param("userId") long userId);
}
