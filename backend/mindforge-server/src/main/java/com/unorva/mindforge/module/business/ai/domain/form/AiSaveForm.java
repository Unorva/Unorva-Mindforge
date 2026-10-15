package com.unorva.mindforge.module.business.ai.domain.form;

import com.unorva.mindforge.module.business.ai.domain.dto.AiFeaturesDTO;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

public record AiSaveForm(
        @NotBlank @Size(max = 80) String provider,
        @NotBlank @Size(max = 120) String model,
        @NotNull @DecimalMin("0") @DecimalMax("2") BigDecimal temperature,
        @Min(1) @Max(8192) int maxTokens,
        @Size(max = 40) String language,
        @Size(max = 12000) String systemPrompt,
        @NotNull AiFeaturesDTO features,
        @Size(max = 1000) String baseUrl,
        @Size(max = 512) String apiKey) {}
