package com.unorva.mindforge.module.business.finance.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.unorva.mindforge.common.datasource.manager.BusinessLockManager;
import com.unorva.mindforge.common.exception.BusinessErrorCode;
import com.unorva.mindforge.common.exception.BusinessException;
import com.unorva.mindforge.module.business.finance.dao.FinanceAccountDao;
import com.unorva.mindforge.module.business.finance.dao.FinanceBudgetDao;
import com.unorva.mindforge.module.business.finance.dao.FinanceTransactionDao;
import com.unorva.mindforge.module.business.finance.domain.entity.FinanceAccountEntity;
import com.unorva.mindforge.module.business.finance.domain.form.AccountSaveForm;
import com.unorva.mindforge.module.business.finance.domain.form.BudgetSaveForm;
import com.unorva.mindforge.module.business.finance.domain.form.TransactionSaveForm;
import com.unorva.mindforge.module.business.finance.domain.vo.AccountVO;
import com.unorva.mindforge.module.business.finance.manager.FinanceManager;

import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;

/**
 * Baseline: reject out-of-range dates and money; derive opening balances while holding both locks.
 */
class FinanceBoundaryTest {
    private final FinanceAccountDao accountDao = mock(FinanceAccountDao.class);
    private final FinanceTransactionDao transactionDao = mock(FinanceTransactionDao.class);
    private final FinanceBudgetDao budgetDao = mock(FinanceBudgetDao.class);
    private final BusinessLockManager lockManager = mock(BusinessLockManager.class);
    private final FinanceManager manager =
            new FinanceManager(accountDao, transactionDao, budgetDao, lockManager);
    private final FinanceService service = new FinanceService(accountDao, transactionDao, manager);

    @Test
    void rejectsInvalidBudgetMonthsBeforeAnyDatabaseWrite() {
        BusinessException invalidMonth =
                assertThrows(
                        BusinessException.class,
                        () ->
                                service.saveBudget(
                                        7L,
                                        new BudgetSaveForm(
                                                "2026-99", "餐饮", new BigDecimal("100"))));
        assertEquals(BusinessErrorCode.INVALID_INPUT, invalidMonth.getErrorCode());
        assertThrows(
                BusinessException.class,
                () ->
                        service.saveBudget(
                                7L, new BudgetSaveForm("0999-12", "餐饮", new BigDecimal("100"))));
        assertThrows(BusinessException.class, () -> service.budgets(7L, YearMonth.of(10000, 1)));
        verifyNoInteractions(accountDao, transactionDao, budgetDao, lockManager);
    }

    @Test
    void rejectsTransactionDatesOutsideTheDatabaseCalendarBeforeAnyWrite() {
        assertThrows(
                BusinessException.class,
                () -> service.saveTransaction(7L, null, transaction(LocalDate.of(999, 12, 31))));
        assertThrows(
                BusinessException.class,
                () -> service.saveTransaction(7L, null, transaction(LocalDate.of(10000, 1, 1))));
        verifyNoInteractions(accountDao, transactionDao, budgetDao, lockManager);
    }

    @Test
    void supportsLastDatabaseMonthWithoutProducingAnUnsupportedNextYear() {
        when(budgetDao.listBudgets(
                        7L, "9999-12", LocalDate.of(9999, 12, 1), LocalDate.of(9999, 12, 31)))
                .thenReturn(List.of());
        assertTrue(service.budgets(7L, YearMonth.of(9999, 12)).isEmpty());
        verify(budgetDao)
                .listBudgets(7L, "9999-12", LocalDate.of(9999, 12, 1), LocalDate.of(9999, 12, 31));
        verifyNoInteractions(lockManager);
    }

    @Test
    void rejectsOpeningBalanceOverflowAfterSubtractingExistingLedger() {
        when(accountDao.lockAccount(7L, 5L)).thenReturn(5L);
        when(transactionDao.accountNet(7L, 5L)).thenReturn(new BigDecimal("-0.01"));
        AccountSaveForm form =
                new AccountSaveForm("账户", "现金", new BigDecimal("9999999999999999.99"));
        BusinessException exception =
                assertThrows(BusinessException.class, () -> service.saveAccount(7L, 5L, form));
        assertEquals(BusinessErrorCode.INVALID_INPUT, exception.getErrorCode());
        verify(accountDao, never()).updateAccount(any(FinanceAccountEntity.class));
        var order = inOrder(lockManager, accountDao, transactionDao);
        order.verify(lockManager).lock(7L, "finance");
        order.verify(accountDao).lockAccount(7L, 5L);
        order.verify(transactionDao).accountNet(7L, 5L);
    }

    @Test
    void updatingBalanceSubtractsLedgerWhileHoldingFinanceAndAccountLocks() {
        when(accountDao.lockAccount(7L, 5L)).thenReturn(5L);
        when(transactionDao.accountNet(7L, 5L)).thenReturn(new BigDecimal("75.25"));
        when(accountDao.updateAccount(any(FinanceAccountEntity.class))).thenReturn(1);
        AccountVO saved = new AccountVO(5L, "账户", "现金", new BigDecimal("100.00"));
        when(accountDao.listAccounts(7L)).thenReturn(List.of(saved));
        assertEquals(
                saved,
                service.saveAccount(
                        7L, 5L, new AccountSaveForm(" 账户 ", "现金", new BigDecimal("100.00"))));
        var order = inOrder(lockManager, accountDao, transactionDao);
        order.verify(lockManager).lock(7L, "finance");
        order.verify(accountDao).lockAccount(7L, 5L);
        order.verify(transactionDao).accountNet(7L, 5L);
        ArgumentCaptor<FinanceAccountEntity> entity =
                ArgumentCaptor.forClass(FinanceAccountEntity.class);
        order.verify(accountDao).updateAccount(entity.capture());
        assertEquals(new BigDecimal("24.75"), entity.getValue().getOpeningBalance());
        assertEquals(7L, entity.getValue().getUserId());
        assertEquals(5L, entity.getValue().getId());
    }

    @Test
    void accountWithTransactionsCannotBeDeleted() {
        when(accountDao.lockAccount(7L, 5L)).thenReturn(5L);
        when(transactionDao.accountTransactionCount(7L, 5L)).thenReturn(1L);
        BusinessException exception =
                assertThrows(BusinessException.class, () -> service.deleteAccount(7L, 5L));
        assertEquals(BusinessErrorCode.CONFLICT, exception.getErrorCode());
        verify(accountDao, never()).deleteAccount(anyLong(), anyLong());
        verify(lockManager).lock(7L, "finance");
    }

    private static TransactionSaveForm transaction(LocalDate date) {
        return new TransactionSaveForm(date, "收入", "工资", "", 1L, new BigDecimal("1.00"), "手动录入");
    }
}
