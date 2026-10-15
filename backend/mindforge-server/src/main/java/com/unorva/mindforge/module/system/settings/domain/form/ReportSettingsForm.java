package com.unorva.mindforge.module.system.settings.domain.form;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record ReportSettingsForm(@NotBlank @Pattern(regexp = "星期一|星期二|星期三|星期四|星期五|星期六|星期日") String weekStartsOn) {}
