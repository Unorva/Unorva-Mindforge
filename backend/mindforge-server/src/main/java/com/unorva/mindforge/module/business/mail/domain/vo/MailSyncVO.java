package com.unorva.mindforge.module.business.mail.domain.vo;

public record MailSyncVO(Long accountId, Integer syncedCount, String message, int changedCount) {
    public MailSyncVO(Long accountId, Integer syncedCount, String message) {
        this(accountId, syncedCount, message, syncedCount == null ? 0 : syncedCount);
    }
}
