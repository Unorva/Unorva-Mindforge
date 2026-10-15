package com.unorva.mindforge.module.business.finance.manager;

import com.unorva.mindforge.common.datasource.manager.BusinessLockManager;
import com.unorva.mindforge.common.datasource.support.DaoSupport;
import com.unorva.mindforge.common.exception.BusinessErrorCode;
import com.unorva.mindforge.common.exception.BusinessException;
import com.unorva.mindforge.module.business.finance.dao.FinanceAccountDao;
import com.unorva.mindforge.module.business.finance.dao.FinanceBudgetDao;
import com.unorva.mindforge.module.business.finance.dao.FinanceTransactionDao;
import com.unorva.mindforge.module.business.finance.domain.bo.FinanceSnapshotBO;
import com.unorva.mindforge.module.business.finance.domain.entity.FinanceAccountEntity;
import com.unorva.mindforge.module.business.finance.domain.entity.FinanceBudgetEntity;
import com.unorva.mindforge.module.business.finance.domain.entity.FinanceTransactionEntity;
import com.unorva.mindforge.module.business.finance.domain.form.AccountSaveForm;
import com.unorva.mindforge.module.business.finance.domain.form.BudgetSaveForm;
import com.unorva.mindforge.module.business.finance.domain.form.TransactionSaveForm;
import com.unorva.mindforge.module.business.finance.domain.vo.AccountVO;
import com.unorva.mindforge.module.business.finance.domain.vo.BudgetVO;
import com.unorva.mindforge.module.business.finance.domain.vo.MonthlyPointVO;
import com.unorva.mindforge.module.business.finance.domain.vo.TransactionVO;
import com.unorva.mindforge.module.business.finance.support.FinanceAmounts;

import lombok.RequiredArgsConstructor;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.List;

/** Coordinates account, ledger and budget data inside finance transactions. */
@Service
@RequiredArgsConstructor
public class FinanceManager {
    private final FinanceAccountDao accountDao;
    private final FinanceTransactionDao transactionDao;
    private final FinanceBudgetDao budgetDao;
    private final BusinessLockManager lockManager;

    @Transactional(rollbackFor = Exception.class)
    public AccountVO saveAccount(long userId, Long id, AccountSaveForm form) {
        lockManager.lock(userId, "finance");
        FinanceAccountEntity entity = new FinanceAccountEntity();
        entity.setId(id);
        entity.setUserId(userId);
        entity.setName(form.name().trim());
        entity.setAccountType(form.type());
        if (id == null) {
            entity.setOpeningBalance(form.balance());
            accountDao.insertAccount(entity);
            requireGeneratedId(entity.getId());
        } else {
            lockAccount(userId, id);
            BigDecimal net = transactionDao.accountNet(userId, id);
            BigDecimal openingBalance =
                    form.balance().subtract(net == null ? BigDecimal.ZERO : net);
            FinanceAmounts.requireStoredAmount(openingBalance);
            entity.setOpeningBalance(openingBalance);
            DaoSupport.requireChanged(accountDao.updateAccount(entity));
        }
        return accountDao.listAccounts(userId).stream()
                .filter(account -> account.id() == entity.getId())
                .findFirst()
                .orElseThrow(() -> new BusinessException(BusinessErrorCode.NOT_FOUND));
    }

    @Transactional(rollbackFor = Exception.class)
    public void deleteAccount(long userId, long id) {
        lockManager.lock(userId, "finance");
        lockAccount(userId, id);
        if (transactionDao.accountTransactionCount(userId, id) > 0) {
            throw new BusinessException("账户已有流水，请先迁移或删除流水", BusinessErrorCode.CONFLICT);
        }
        DaoSupport.requireChanged(accountDao.deleteAccount(userId, id));
    }

    @Transactional(rollbackFor = Exception.class)
    public TransactionVO saveTransaction(long userId, Long id, TransactionSaveForm form) {
        lockManager.lock(userId, "finance");
        lockAccount(userId, form.accountId());
        FinanceTransactionEntity entity = new FinanceTransactionEntity();
        entity.setId(id);
        entity.setUserId(userId);
        entity.setAccountId(form.accountId());
        entity.setTransactionDate(form.date());
        entity.setTransactionType(form.type());
        entity.setCategory(form.category().trim());
        entity.setDescription(form.description() == null ? "" : form.description());
        entity.setSource(form.source() == null ? "手动录入" : form.source());
        entity.setAmount(form.amount());
        if (id == null) {
            transactionDao.insertTransaction(entity);
            requireGeneratedId(entity.getId());
        } else {
            DaoSupport.requireChanged(transactionDao.updateTransaction(entity));
        }
        return new TransactionVO(
                entity.getId(),
                entity.getTransactionDate(),
                entity.getTransactionType(),
                entity.getCategory(),
                entity.getDescription(),
                entity.getAccountId(),
                entity.getAmount(),
                entity.getSource());
    }

    @Transactional(rollbackFor = Exception.class)
    public void deleteTransaction(long userId, long id) {
        lockManager.lock(userId, "finance");
        DaoSupport.requireChanged(transactionDao.deleteTransaction(userId, id));
    }

    @Transactional(rollbackFor = Exception.class)
    public List<BudgetVO> saveBudget(long userId, YearMonth month, BudgetSaveForm form) {
        lockManager.lock(userId, "finance");
        FinanceBudgetEntity entity = new FinanceBudgetEntity();
        entity.setUserId(userId);
        entity.setMonthValue(month.toString());
        entity.setCategory(form.category().trim());
        entity.setAmount(form.budget());
        budgetDao.saveBudget(entity);
        return budgets(userId, month);
    }

    @Transactional(rollbackFor = Exception.class)
    public void deleteBudget(long userId, long id) {
        lockManager.lock(userId, "finance");
        DaoSupport.requireChanged(budgetDao.deleteBudget(userId, id));
    }

    @Transactional(readOnly = true)
    public List<BudgetVO> budgets(long userId, YearMonth month) {
        return budgetDao.listBudgets(
                userId, month.toString(), month.atDay(1), month.atEndOfMonth());
    }

    @Transactional(readOnly = true)
    public FinanceSnapshotBO snapshot(long userId, YearMonth month) {
        List<AccountVO> accounts = accountDao.listAccounts(userId);
        List<MonthlyPointVO> trend = new ArrayList<>();
        for (int offset = 5; offset >= 0; offset--) {
            YearMonth pointMonth = month.minusMonths(offset);
            trend.add(
                    transactionDao.monthlyPoint(
                            userId,
                            pointMonth.toString(),
                            pointMonth.atDay(1),
                            pointMonth.atEndOfMonth()));
        }
        return new FinanceSnapshotBO(
                accounts,
                trend,
                transactionDao.expenseCategories(userId, month.atDay(1), month.atEndOfMonth()),
                budgets(userId, month),
                accountDao.lastSyncAt(userId));
    }

    private void lockAccount(long userId, long id) {
        DaoSupport.requireExists(accountDao.lockAccount(userId, id) == null ? 0 : 1);
    }

    private static void requireGeneratedId(Long id) {
        if (id == null) {
            throw new BusinessException("保存失败，请稍后重试", BusinessErrorCode.CONFLICT);
        }
    }
}
