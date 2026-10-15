package com.unorva.mindforge.module.business.mail.domain.form;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

public record MailSendForm(
        @Positive Long id,
        @NotNull @Positive Long accountId,
        @NotBlank @Email @Size(max = 254) String recipient,
        @Size(max = 200) String subject,
        @Size(max = 200000) String body) {}
