package com.unorva.mindforge.module.business.finance.domain.vo;

import java.math.BigDecimal;

public record BudgetVO(
        long id, String month, String category, BigDecimal budget, BigDecimal spent) {}
