package com.unorva.mindforge.module.business.finance.domain.bo;

import com.unorva.mindforge.module.business.finance.domain.vo.AccountVO;
import com.unorva.mindforge.module.business.finance.domain.vo.BudgetVO;
import com.unorva.mindforge.module.business.finance.domain.vo.CategorySliceVO;
import com.unorva.mindforge.module.business.finance.domain.vo.MonthlyPointVO;

import java.time.LocalDateTime;
import java.util.List;

/** Consistent ledger data used by service-level summary calculations. */
public record FinanceSnapshotBO(
        List<AccountVO> accounts,
        List<MonthlyPointVO> trend,
        List<CategorySliceVO> categories,
        List<BudgetVO> budgets,
        LocalDateTime lastSyncAt) {}
