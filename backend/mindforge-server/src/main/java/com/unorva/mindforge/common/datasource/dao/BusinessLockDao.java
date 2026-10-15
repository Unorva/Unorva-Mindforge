package com.unorva.mindforge.common.datasource.dao;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

/** Composite-key operations; inherited single-key CRUD is not used. */
@Mapper
public interface BusinessLockDao {
    int ensureKey(@Param("userId") long userId, @Param("module") String module);
    Long lockKey(@Param("userId") long userId, @Param("module") String module);
}
