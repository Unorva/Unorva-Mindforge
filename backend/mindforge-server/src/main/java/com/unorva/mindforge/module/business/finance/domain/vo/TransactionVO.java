package com.unorva.mindforge.module.business.finance.domain.vo;

import java.math.BigDecimal;
import java.time.LocalDate;

public record TransactionVO(
        long id,
        LocalDate date,
        String type,
        String category,
        String description,
        long accountId,
        BigDecimal amount,
        String source) {}
