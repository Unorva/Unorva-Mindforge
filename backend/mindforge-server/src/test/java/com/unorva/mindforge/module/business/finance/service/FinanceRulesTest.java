package com.unorva.mindforge.module.business.finance.service;

import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

/** Monthly comparisons retain exact decimal arithmetic and explicit baseline rules. */
class FinanceRulesTest {
    @Test
    void percentageChangeUsesExactDecimalsAndNoInventedZeroBaseline() {
        assertEquals(
                new BigDecimal("25.00"),
                FinanceService.percentageChange(
                        new BigDecimal("125.00"), new BigDecimal("100.00")));
        assertEquals(
                new BigDecimal("-25.00"),
                FinanceService.percentageChange(new BigDecimal("75.00"), new BigDecimal("100.00")));
        assertEquals(
                BigDecimal.ZERO,
                FinanceService.percentageChange(new BigDecimal("125.00"), BigDecimal.ZERO));
    }
}
