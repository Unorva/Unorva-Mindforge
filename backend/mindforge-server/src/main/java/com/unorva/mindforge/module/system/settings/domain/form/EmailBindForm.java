package com.unorva.mindforge.module.system.settings.domain.form;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record EmailBindForm(
        @NotBlank @Email @Size(max = 254) String email, @NotBlank @Size(max = 80) String provider) {}
