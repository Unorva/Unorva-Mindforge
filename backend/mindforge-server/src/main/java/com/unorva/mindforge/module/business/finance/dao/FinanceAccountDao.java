package com.unorva.mindforge.module.business.finance.dao;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.unorva.mindforge.module.business.finance.domain.entity.FinanceAccountEntity;
import com.unorva.mindforge.module.business.finance.domain.vo.AccountVO;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.time.LocalDateTime;
import java.util.List;

@Mapper
public interface FinanceAccountDao extends BaseMapper<FinanceAccountEntity> {
    List<AccountVO> listAccounts(@Param("userId") long userId);

    Long lockAccount(@Param("userId") long userId, @Param("id") long id);

    int insertAccount(@Param("entity") FinanceAccountEntity entity);

    int updateAccount(@Param("entity") FinanceAccountEntity entity);

    int deleteAccount(@Param("userId") long userId, @Param("id") long id);

    LocalDateTime lastSyncAt(@Param("userId") long userId);
}
