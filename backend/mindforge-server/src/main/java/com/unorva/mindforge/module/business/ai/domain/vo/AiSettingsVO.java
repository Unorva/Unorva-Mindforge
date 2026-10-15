package com.unorva.mindforge.module.business.ai.domain.vo;

import com.unorva.mindforge.module.business.ai.domain.dto.AiFeaturesDTO;

import java.math.BigDecimal;

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
        boolean configured) {}
