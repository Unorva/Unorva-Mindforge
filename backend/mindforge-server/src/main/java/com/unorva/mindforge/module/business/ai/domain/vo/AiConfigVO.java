package com.unorva.mindforge.module.business.ai.domain.vo;

import java.util.List;

public record AiConfigVO(
        boolean configured,
        String provider,
        String model,
        List<String> capabilities,
        boolean enabled,
        List<String> models) {
    public AiConfigVO(boolean configured, String provider, String model, List<String> capabilities) {
        this(
                configured,
                provider,
                model,
                capabilities,
                true,
                model == null || model.isBlank() ? List.of() : List.of(model));
    }
}
