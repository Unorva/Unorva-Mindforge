package com.unorva.mindforge.module.business.mail.domain.bo;

/** A UID is reusable only inside the same provider mailbox generation. */
public record MailRemoteIdentityBO(long uidValidity, long uid) {}
