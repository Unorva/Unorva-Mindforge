package com.unorva.mindforge.module.business.mail.dao;

import com.unorva.mindforge.module.business.mail.domain.entity.*;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import java.util.List;

/** MyBatis persistence for one mail table; every custom operation binds its owner. */
@Mapper
public interface MailRemoteDao {
    MailRemoteEntity selectForMail(@Param("userId") long userId, @Param("id") long id);
    MailRemoteEntity selectIdentity(@Param("userId") long userId, @Param("accountId") long accountId,
                                  @Param("validity") long validity, @Param("uid") long uid);
    int insertIdentity(@Param("entity") MailRemoteEntity entity);
    int tombstone(@Param("userId") long userId, @Param("id") long id);
    List<Long> selectObsoleteMailIds(@Param("userId") long userId, @Param("accountId") long accountId, @Param("validity") long validity);
    int deleteObsolete(@Param("userId") long userId, @Param("accountId") long accountId, @Param("validity") long validity);
    int deleteForAccount(@Param("userId") long userId, @Param("accountId") long accountId);
}
