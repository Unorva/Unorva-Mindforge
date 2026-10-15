package com.unorva.mindforge.module.business.finance.domain.vo;

import java.math.BigDecimal;

public record MonthlyPointVO(String month, BigDecimal income, BigDecimal expense) {}
