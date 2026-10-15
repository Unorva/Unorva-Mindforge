package com.unorva.mindforge.module.business.finance.support;

import com.unorva.mindforge.common.exception.BusinessErrorCode;
import com.unorva.mindforge.common.exception.BusinessException;

import java.math.BigDecimal;

/** Storage boundary shared by direct input and balances recalculated under the account lock. */
public final class FinanceAmounts {
    private static final BigDecimal MAXIMUM_STORED_AMOUNT = new BigDecimal("9999999999999999.99");

    private FinanceAmounts() {}

    public static void requireStoredAmount(BigDecimal amount) {
        if (amount == null || amount.abs().compareTo(MAXIMUM_STORED_AMOUNT) > 0) {
            throw new BusinessException(
                    "余额超过数据库支持范围，请调整账户余额或关联流水", BusinessErrorCode.INVALID_INPUT);
        }
    }
}
