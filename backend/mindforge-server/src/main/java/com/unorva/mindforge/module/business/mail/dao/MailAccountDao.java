package com.unorva.mindforge.module.business.mail.dao;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.unorva.mindforge.module.business.mail.domain.entity.*;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import java.util.List;

/** MyBatis persistence for one mail table; every custom operation binds its owner. */
@Mapper
public interface MailAccountDao extends BaseMapper<MailAccountEntity> {
    List<MailAccountEntity> listOwned(@Param("userId") long userId);
    MailAccountEntity selectOwned(@Param("userId") long userId, @Param("id") long id);
    Long countOwned(@Param("userId") long userId);
    int insertOwned(@Param("entity") MailAccountEntity entity);
    int updateOwned(@Param("entity") MailAccountEntity entity);
    int clearDefault(@Param("userId") long userId);
    int clearDisabledDefault(@Param("userId") long userId);
    Long countEnabledDefault(@Param("userId") long userId);
    int assignFirstDefault(@Param("userId") long userId);
    int clearLastSync(@Param("userId") long userId, @Param("id") long id);
    int deleteOwned(@Param("userId") long userId, @Param("id") long id);
    int connectionSuccess(@Param("userId") long userId, @Param("id") long id);
    int syncSuccess(@Param("userId") long userId, @Param("id") long id);
    int connectionFailure(@Param("userId") long userId, @Param("id") long id, @Param("message") String message);
}
