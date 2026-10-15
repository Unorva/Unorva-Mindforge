package com.unorva.mindforge.module.system.settings.domain.form;

import com.fasterxml.jackson.annotation.JsonProperty;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record AppOptionsForm(
        @NotBlank @Pattern(regexp = "实时|每小时|每天|手动") String syncFrequency,
        @JsonProperty("notify") boolean notifyEnabled,
        boolean aiAssist) {}
