package com.unorva.mindforge.module.business.ai.domain.vo;

import com.unorva.mindforge.module.business.ai.domain.dto.AiFeaturesDTO;

import java.math.BigDecimal;
import java.util.List;

public record AiSettingsVO(
        String provider,
        String model,
        BigDecimal temperature,
        int maxTokens,
        String language,
        String systemPrompt,
        AiFeaturesDTO features,
        String baseUrl,
        String apiKey,
        boolean configured,
        boolean enabled,
        List<String> enabledModels) {
    public AiSettingsVO {
        enabledModels =
                enabledModels == null
                        ? (model == null || model.isBlank() ? List.of() : List.of(model.trim()))
                        : List.copyOf(enabledModels);
    }

    public AiSettingsVO(
            String provider,
            String model,
            BigDecimal temperature,
            int maxTokens,
            String language,
            String systemPrompt,
            AiFeaturesDTO features,
            String baseUrl,
            String apiKey,
            boolean configured) {
        this(
                provider,
                model,
                temperature,
                maxTokens,
                language,
                systemPrompt,
                features,
                baseUrl,
                apiKey,
                configured,
                true,
                null);
    }
}
