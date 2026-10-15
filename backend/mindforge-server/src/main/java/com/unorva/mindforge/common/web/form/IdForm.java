package com.unorva.mindforge.common.web.form;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

public record IdForm(@NotNull @Positive Long id) {}
