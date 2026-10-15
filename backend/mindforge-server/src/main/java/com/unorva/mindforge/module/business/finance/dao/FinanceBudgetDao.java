package com.unorva.mindforge.module.business.finance.dao;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.unorva.mindforge.module.business.finance.domain.entity.FinanceBudgetEntity;
import com.unorva.mindforge.module.business.finance.domain.vo.BudgetVO;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.time.LocalDate;
import java.util.List;

@Mapper
public interface FinanceBudgetDao extends BaseMapper<FinanceBudgetEntity> {
    List<BudgetVO> listBudgets(
            @Param("userId") long userId,
            @Param("month") String month,
            @Param("start") LocalDate start,
            @Param("end") LocalDate end);

    int saveBudget(@Param("entity") FinanceBudgetEntity entity);

    int deleteBudget(@Param("userId") long userId, @Param("id") long id);
}
