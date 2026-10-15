package com.unorva.mindforge.module.business.ai.domain.form;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record MessageSaveForm(@NotBlank @Size(max = 16000) String content) {}
