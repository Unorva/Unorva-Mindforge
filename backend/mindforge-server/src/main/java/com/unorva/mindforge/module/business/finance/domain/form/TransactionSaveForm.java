package com.unorva.mindforge.module.business.finance.domain.form;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDate;

public record TransactionSaveForm(
        @NotNull LocalDate date,
        @NotBlank @Pattern(regexp = "收入|支出") String type,
        @NotBlank @Size(max = 80) String category,
        @Size(max = 1000) String description,
        @NotNull @Positive Long accountId,
        @NotNull
                @DecimalMin("0.01")
                @DecimalMax("9999999999999999.99")
                @Digits(integer = 16, fraction = 2)
                BigDecimal amount,
        @Pattern(regexp = "手机端|自动同步|手动录入") String source) {}
