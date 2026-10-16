package com.unorva.mindforge.module.system.settings.domain.form;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record AppearanceSettingsForm(@NotBlank @Pattern(regexp = "plain|dots|watermark") String background) {}
