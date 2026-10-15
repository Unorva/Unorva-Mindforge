package com.unorva.mindforge.module.business.mail.domain.bo;

import com.fasterxml.jackson.annotation.JsonIgnore;

public record MailConnectionBO(
        long id,
        String email,
        String displayName,
        String username,
        String imapHost,
        int imapPort,
        String imapSecurity,
        String smtpHost,
        int smtpPort,
        String smtpSecurity,
        @JsonIgnore String password,
        String authType) {
    @Override
    public String toString() {
        return "MailConnectionBO[id=" + id + ", email=" + email + ", password=REDACTED]";
    }
}
