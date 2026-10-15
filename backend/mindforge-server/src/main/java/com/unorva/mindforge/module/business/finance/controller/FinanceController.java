package com.unorva.mindforge.module.business.finance.controller;

import com.unorva.mindforge.common.security.support.CurrentUser;
import com.unorva.mindforge.common.web.vo.Result;
import com.unorva.mindforge.module.business.finance.domain.form.AccountSaveForm;
import com.unorva.mindforge.module.business.finance.domain.form.BudgetSaveForm;
import com.unorva.mindforge.module.business.finance.domain.form.TransactionSaveForm;
import com.unorva.mindforge.module.business.finance.domain.vo.AccountVO;
import com.unorva.mindforge.module.business.finance.domain.vo.BudgetVO;
import com.unorva.mindforge.module.business.finance.domain.vo.FinanceSummaryVO;
import com.unorva.mindforge.module.business.finance.domain.vo.TransactionVO;
import com.unorva.mindforge.module.business.finance.service.FinanceService;

import jakarta.validation.Valid;

import lombok.RequiredArgsConstructor;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.YearMonth;
import java.util.List;

/** Account, ledger and budget APIs. */
@RestController
@RequiredArgsConstructor
public class FinanceController {
    private final FinanceService financeService;

    @GetMapping("/finance/summary")
    public Result<FinanceSummaryVO> summary() {
        return Result.success(financeService.summary(CurrentUser.id()));
    }

    @GetMapping("/finance/accounts")
    public Result<List<AccountVO>> accounts() {
        return Result.success(financeService.accounts(CurrentUser.id()));
    }

    @PostMapping("/finance/accounts")
    public Result<AccountVO> createAccount(@RequestBody @Valid AccountSaveForm param) {
        return Result.success(financeService.saveAccount(CurrentUser.id(), null, param));
    }

    @PutMapping("/finance/accounts/{id}")
    public Result<AccountVO> updateAccount(
            @PathVariable long id, @RequestBody @Valid AccountSaveForm param) {
        return Result.success(financeService.saveAccount(CurrentUser.id(), id, param));
    }

    @DeleteMapping("/finance/accounts/{id}")
    public Result<Void> deleteAccount(@PathVariable long id) {
        financeService.deleteAccount(CurrentUser.id(), id);
        return Result.success();
    }

    @GetMapping("/finance/transactions")
    public Result<List<TransactionVO>> transactions() {
        return Result.success(financeService.transactions(CurrentUser.id()));
    }

    @PostMapping("/finance/transactions")
    public Result<TransactionVO> createTransaction(@RequestBody @Valid TransactionSaveForm param) {
        return Result.success(financeService.saveTransaction(CurrentUser.id(), null, param));
    }

    @PutMapping("/finance/transactions/{id}")
    public Result<TransactionVO> updateTransaction(
            @PathVariable long id, @RequestBody @Valid TransactionSaveForm param) {
        return Result.success(financeService.saveTransaction(CurrentUser.id(), id, param));
    }

    @DeleteMapping("/finance/transactions/{id}")
    public Result<Void> deleteTransaction(@PathVariable long id) {
        financeService.deleteTransaction(CurrentUser.id(), id);
        return Result.success();
    }

    @GetMapping("/finance/budgets")
    public Result<List<BudgetVO>> budgets(
            @RequestParam(required = false) @DateTimeFormat(pattern = "yyyy-MM") YearMonth month) {
        return Result.success(financeService.budgets(CurrentUser.id(), month));
    }

    @PutMapping("/finance/budgets")
    public Result<List<BudgetVO>> saveBudget(@RequestBody @Valid BudgetSaveForm param) {
        return Result.success(financeService.saveBudget(CurrentUser.id(), param));
    }

    @DeleteMapping("/finance/budgets/{id}")
    public Result<Void> deleteBudget(@PathVariable long id) {
        financeService.deleteBudget(CurrentUser.id(), id);
        return Result.success();
    }
}
