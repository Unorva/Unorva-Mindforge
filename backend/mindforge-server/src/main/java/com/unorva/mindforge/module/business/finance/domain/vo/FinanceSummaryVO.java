package com.unorva.mindforge.module.business.finance.domain.vo;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public record FinanceSummaryVO(
        BigDecimal totalAssets,
        BigDecimal monthIncome,
        BigDecimal monthExpense,
        BigDecimal monthBalance,
        BigDecimal savingsRate,
        BigDecimal incomeDelta,
        BigDecimal expenseDelta,
        LocalDateTime lastSyncAt,
        List<AccountVO> accounts,
        List<MonthlyPointVO> monthlyTrend,
        List<CategorySliceVO> categoryBreakdown,
        List<BudgetVO> budgets) {}
