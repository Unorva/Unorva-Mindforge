package com.unorva.mindforge.module.business.finance.service;

import com.unorva.mindforge.common.exception.BusinessErrorCode;
import com.unorva.mindforge.common.exception.BusinessException;
import com.unorva.mindforge.module.business.finance.dao.FinanceAccountDao;
import com.unorva.mindforge.module.business.finance.dao.FinanceTransactionDao;
import com.unorva.mindforge.module.business.finance.domain.bo.FinanceSnapshotBO;
import com.unorva.mindforge.module.business.finance.domain.form.AccountSaveForm;
import com.unorva.mindforge.module.business.finance.domain.form.BudgetSaveForm;
import com.unorva.mindforge.module.business.finance.domain.form.TransactionSaveForm;
import com.unorva.mindforge.module.business.finance.domain.vo.AccountVO;
import com.unorva.mindforge.module.business.finance.domain.vo.BudgetVO;
import com.unorva.mindforge.module.business.finance.domain.vo.FinanceSummaryVO;
import com.unorva.mindforge.module.business.finance.domain.vo.MonthlyPointVO;
import com.unorva.mindforge.module.business.finance.domain.vo.TransactionVO;
import com.unorva.mindforge.module.business.finance.manager.FinanceManager;
import com.unorva.mindforge.module.business.finance.support.FinanceAmounts;

import lombok.RequiredArgsConstructor;

import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.DateTimeException;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.ZoneId;
import java.util.List;

/** Finance input rules and summary calculations over a consistent ledger snapshot. */
@Service
@RequiredArgsConstructor
public class FinanceService {
    private static final ZoneId FINANCE_ZONE = ZoneId.of("Asia/Shanghai");
    private static final BigDecimal ONE_HUNDRED = new BigDecimal("100");
    private static final int MINIMUM_SUPPORTED_YEAR = 1000;
    private static final int MAXIMUM_SUPPORTED_YEAR = 9999;
    private final FinanceAccountDao accountDao;
    private final FinanceTransactionDao transactionDao;
    private final FinanceManager manager;

    public List<AccountVO> accounts(long userId) {
        return accountDao.listAccounts(userId);
    }

    public AccountVO saveAccount(long userId, Long id, AccountSaveForm form) {
        FinanceAmounts.requireStoredAmount(form.balance());
        return manager.saveAccount(userId, id, form);
    }

    public void deleteAccount(long userId, long id) {
        manager.deleteAccount(userId, id);
    }

    public List<TransactionVO> transactions(long userId) {
        return transactionDao.listTransactions(userId);
    }

    public TransactionVO saveTransaction(long userId, Long id, TransactionSaveForm form) {
        validateDate(form.date());
        return manager.saveTransaction(userId, id, form);
    }

    public void deleteTransaction(long userId, long id) {
        manager.deleteTransaction(userId, id);
    }

    public List<BudgetVO> budgets(long userId, YearMonth month) {
        YearMonth requestedMonth = month == null ? currentMonth() : month;
        validateMonth(requestedMonth);
        return manager.budgets(userId, requestedMonth);
    }

    public List<BudgetVO> saveBudget(long userId, BudgetSaveForm form) {
        YearMonth month = parseBudgetMonth(form.month());
        return manager.saveBudget(userId, month, form);
    }

    public void deleteBudget(long userId, long id) {
        manager.deleteBudget(userId, id);
    }

    public FinanceSummaryVO summary(long userId) {
        FinanceSnapshotBO snapshot = manager.snapshot(userId, currentMonth());
        List<MonthlyPointVO> trend = snapshot.trend();
        MonthlyPointVO current = trend.getLast();
        MonthlyPointVO previous = trend.get(trend.size() - 2);
        BigDecimal totalAssets =
                snapshot.accounts().stream()
                        .map(AccountVO::balance)
                        .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal balance = current.income().subtract(current.expense());
        BigDecimal savingsRate =
                current.income().signum() == 0
                        ? BigDecimal.ZERO
                        : balance.multiply(ONE_HUNDRED)
                                .divide(current.income(), 2, RoundingMode.HALF_UP);
        return new FinanceSummaryVO(
                totalAssets,
                current.income(),
                current.expense(),
                balance,
                savingsRate,
                percentageChange(current.income(), previous.income()),
                percentageChange(current.expense(), previous.expense()),
                snapshot.lastSyncAt(),
                snapshot.accounts(),
                trend,
                snapshot.categories(),
                snapshot.budgets());
    }

    /** No prior baseline means a zero delta rather than an invented growth percentage. */
    public static BigDecimal percentageChange(BigDecimal current, BigDecimal previous) {
        if (previous.signum() == 0) {
            return BigDecimal.ZERO;
        }
        return current.subtract(previous)
                .multiply(ONE_HUNDRED)
                .divide(previous.abs(), 2, RoundingMode.HALF_UP);
    }

    private static YearMonth currentMonth() {
        return YearMonth.from(LocalDate.now(FINANCE_ZONE));
    }

    private static YearMonth parseBudgetMonth(String value) {
        try {
            YearMonth month = value == null ? currentMonth() : YearMonth.parse(value);
            validateMonth(month);
            return month;
        } catch (DateTimeException exception) {
            throw new BusinessException("预算月份必须是有效的 yyyy-MM 日期", BusinessErrorCode.INVALID_INPUT);
        }
    }

    private static void validateMonth(YearMonth month) {
        if (month.getYear() < MINIMUM_SUPPORTED_YEAR || month.getYear() > MAXIMUM_SUPPORTED_YEAR) {
            throw new BusinessException("预算年份必须在 1000 至 9999 年之间", BusinessErrorCode.INVALID_INPUT);
        }
    }

    private static void validateDate(LocalDate date) {
        if (date == null
                || date.getYear() < MINIMUM_SUPPORTED_YEAR
                || date.getYear() > MAXIMUM_SUPPORTED_YEAR) {
            throw new BusinessException("流水日期必须在 1000 至 9999 年之间", BusinessErrorCode.INVALID_INPUT);
        }
    }
}
