package com.unorva.mindforge.module.business.finance.domain.vo;

import java.math.BigDecimal;

public record AccountVO(long id, String name, String type, BigDecimal balance) {}
