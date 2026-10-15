package com.unorva.mindforge.module.business.mail.domain.bo;
import java.time.LocalDateTime;
/** Bounded transport payload from the provider's INBOX. */
public record RemoteMailBO(long uidValidity, long uid, String sender, String recipient, String subject, String body,
                           boolean starred, boolean unread, LocalDateTime receivedAt) {}
