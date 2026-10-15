package com.unorva.mindforge.module.business.finance.domain.form;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

public record BudgetSaveForm(
        @Pattern(regexp = "\\d{4}-\\d{2}") String month,
        @NotBlank @Size(max = 80) String category,
        @NotNull @DecimalMin("0") @Digits(integer = 16, fraction = 2) BigDecimal budget) {}
