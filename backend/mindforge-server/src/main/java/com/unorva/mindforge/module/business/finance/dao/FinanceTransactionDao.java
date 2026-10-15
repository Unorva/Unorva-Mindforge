package com.unorva.mindforge.module.business.finance.dao;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.unorva.mindforge.module.business.finance.domain.entity.FinanceTransactionEntity;
import com.unorva.mindforge.module.business.finance.domain.vo.CategorySliceVO;
import com.unorva.mindforge.module.business.finance.domain.vo.MonthlyPointVO;
import com.unorva.mindforge.module.business.finance.domain.vo.TransactionVO;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Mapper
public interface FinanceTransactionDao extends BaseMapper<FinanceTransactionEntity> {
    List<TransactionVO> listTransactions(@Param("userId") long userId);

    BigDecimal accountNet(@Param("userId") long userId, @Param("id") long id);

    long accountTransactionCount(@Param("userId") long userId, @Param("id") long id);

    int insertTransaction(@Param("entity") FinanceTransactionEntity entity);

    int updateTransaction(@Param("entity") FinanceTransactionEntity entity);

    int deleteTransaction(@Param("userId") long userId, @Param("id") long id);

    MonthlyPointVO monthlyPoint(
            @Param("userId") long userId,
            @Param("month") String month,
            @Param("start") LocalDate start,
            @Param("end") LocalDate end);

    List<CategorySliceVO> expenseCategories(
            @Param("userId") long userId,
            @Param("start") LocalDate start,
            @Param("end") LocalDate end);
}
