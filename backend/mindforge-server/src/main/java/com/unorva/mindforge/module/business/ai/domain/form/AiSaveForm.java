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
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

public record AiSaveForm(
        @NotBlank @Size(max = 80) String provider,
        @NotBlank @Size(max = 120) String model,
        @NotNull @DecimalMin("0") @DecimalMax("2") BigDecimal temperature,
        @Min(1) @Max(8192) int maxTokens,
        @Size(max = 40) String language,
        @Size(max = 12000) String systemPrompt,
        @NotNull AiFeaturesDTO features,
        @Size(max = 1000) String baseUrl,
        @Size(max = 512) String apiKey,
        Boolean enabled,
        @Size(max = 200) List<@NotBlank @Size(max = 120) String> enabledModels) {
    public AiSaveForm {
        enabled = enabled == null || enabled;
        enabledModels =
                enabledModels == null
                        ? (model == null || model.isBlank() ? List.of() : List.of(model.trim()))
                        : Collections.unmodifiableList(new ArrayList<>(enabledModels));
    }

    public AiSaveForm(
            String provider,
            String model,
            BigDecimal temperature,
            int maxTokens,
            String language,
            String systemPrompt,
            AiFeaturesDTO features,
            String baseUrl,
            String apiKey) {
        this(provider, model, temperature, maxTokens, language, systemPrompt, features, baseUrl, apiKey, true, null);
    }
}
