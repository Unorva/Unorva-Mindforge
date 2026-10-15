package com.unorva.mindforge.module.business.ai.domain.vo;

import java.util.List;

public record AiConfigVO(boolean configured, String provider, String model, List<String> capabilities) {}
