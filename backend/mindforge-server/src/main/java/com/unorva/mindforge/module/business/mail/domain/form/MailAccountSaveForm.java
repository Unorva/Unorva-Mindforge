package com.unorva.mindforge.module.business.mail.domain.form;

import com.fasterxml.jackson.annotation.JsonProperty;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

public record MailAccountSaveForm(
        @Positive Long id,
        @Pattern(regexp = "qq|163|126|gmail|outlook|icloud|custom") String provider,
        @Email @Size(max = 254) String email,
        @Size(max = 100) String displayName,
        @Size(max = 254) String username,
        @Size(max = 253) String imapHost,
        @Min(1) @Max(65535) Integer imapPort,
        @Pattern(regexp = "ssl|starttls") String imapSecurity,
        @Size(max = 253) String smtpHost,
        @Min(1) @Max(65535) Integer smtpPort,
        @Pattern(regexp = "ssl|starttls") String smtpSecurity,
        Boolean enabled,
        Boolean isDefault,
        @JsonProperty(access = JsonProperty.Access.WRITE_ONLY) @Size(max = 16000) String password,
        @Pattern(regexp = "password|oauth2") String authType) {
    @Override
    public String toString() {
        return "MailAccountSaveForm[id="
                + id
                + ", provider="
                + provider
                + ", email="
                + email
                + ", password=REDACTED]";
    }
}
