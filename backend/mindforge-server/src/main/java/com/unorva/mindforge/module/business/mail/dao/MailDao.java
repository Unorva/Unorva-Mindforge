package com.unorva.mindforge.module.business.mail.dao;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.unorva.mindforge.module.business.mail.domain.bo.MailFlagsVersionBO;
import com.unorva.mindforge.module.business.mail.domain.entity.*;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

/** MyBatis persistence for one mail table; every custom operation binds its owner. */
@Mapper
public interface MailDao extends BaseMapper<MailEntity> {
    List<MailEntity> listOwned(@Param("userId") long userId, @Param("accountId") Long accountId);

    List<MailFlagsVersionBO> selectFlagVersions(
            @Param("userId") long userId, @Param("accountId") long accountId);

    MailEntity selectOwned(@Param("userId") long userId, @Param("id") long id);

    int insertOwned(@Param("entity") MailEntity entity);

    int updateOwned(@Param("entity") MailEntity entity);

    int patchOwned(
            @Param("userId") long userId,
            @Param("id") long id,
            @Param("folder") String folder,
            @Param("starred") Boolean starred,
            @Param("unread") Boolean unread);

    int deleteOwned(@Param("userId") long userId, @Param("id") long id);

    int claim(
            @Param("userId") long userId,
            @Param("id") long id,
            @Param("attemptToken") String token);

    int finishSend(
            @Param("userId") long userId,
            @Param("id") long id,
            @Param("attemptToken") String token,
            @Param("folder") String folder);

    int recover(@Param("userId") long userId, @Param("id") long id);

    Long countSending(@Param("userId") long userId, @Param("accountId") long accountId);

    int deleteForAccount(@Param("userId") long userId, @Param("accountId") long accountId);

    int deleteRemoteCache(@Param("userId") long userId, @Param("accountId") long accountId);

    int deleteObsoleteRemote(
            @Param("userId") long userId, @Param("accountId") long accountId, @Param("id") long id);

    int refreshRemote(@Param("entity") MailEntity entity);
}
