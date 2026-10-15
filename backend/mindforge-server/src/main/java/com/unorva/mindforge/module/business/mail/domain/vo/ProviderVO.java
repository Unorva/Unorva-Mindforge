package com.unorva.mindforge.module.business.mail.domain.vo;

public record ProviderVO(
        String id,
        String name,
        String imapHost,
        int imapPort,
        String imapSecurity,
        String smtpHost,
        int smtpPort,
        String smtpSecurity,
        String helpText,
        String helpUrl,
        String authType) {}
