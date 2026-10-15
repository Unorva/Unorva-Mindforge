package com.unorva.mindforge.module.system.settings.domain.form;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record AppIntegrationForm(
        @NotBlank @Size(max = 64) String id,
        @NotBlank @Size(max = 80) String name,
        @Size(max = 500) String description,
        boolean enabled,
        @NotNull @Valid AppOptionsForm options) {}
