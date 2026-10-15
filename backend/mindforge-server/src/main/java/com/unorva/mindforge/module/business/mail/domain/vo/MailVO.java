package com.unorva.mindforge.module.business.mail.domain.vo;

import java.time.LocalDateTime;

public record MailVO(
        long id,
        String sender,
        String recipient,
        String subject,
        String body,
        String folder,
        boolean starred,
        boolean unread,
        LocalDateTime createdAt,
        LocalDateTime updatedAt,
        Long accountId) {
    public MailVO(
            long id,
            String sender,
            String recipient,
            String subject,
            String body,
            String folder,
            boolean starred,
            boolean unread,
            LocalDateTime createdAt,
            LocalDateTime updatedAt) {
        this(id, sender, recipient, subject, body, folder, starred, unread, createdAt, updatedAt, null);
    }
}
