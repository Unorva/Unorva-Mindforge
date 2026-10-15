package com.unorva.mindforge.module.business.mail.domain.vo;

import java.time.LocalDateTime;

public record MailAccountVO(
        long id,
        String provider,
        String email,
        String displayName,
        String username,
        String imapHost,
        int imapPort,
        String imapSecurity,
        String smtpHost,
        int smtpPort,
        String smtpSecurity,
        boolean enabled,
        boolean isDefault,
        boolean credentialConfigured,
        String status,
        String lastError,
        LocalDateTime lastSyncAt,
        LocalDateTime createdAt,
        LocalDateTime updatedAt,
        String authType) {}
