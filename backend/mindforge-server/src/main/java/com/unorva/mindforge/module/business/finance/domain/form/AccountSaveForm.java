package com.unorva.mindforge.module.business.finance.domain.form;

import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

public record AccountSaveForm(
        @NotBlank @Size(max = 120) String name,
        @NotBlank @Pattern(regexp = "现金|储蓄|投资|电子钱包") String type,
        @NotNull @Digits(integer = 16, fraction = 2) BigDecimal balance) {}
