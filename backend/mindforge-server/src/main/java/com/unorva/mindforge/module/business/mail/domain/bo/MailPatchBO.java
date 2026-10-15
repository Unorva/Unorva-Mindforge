package com.unorva.mindforge.module.business.mail.domain.bo;
/** Snapshot to verify mailbox identity again after remote flag I/O. */
public record MailPatchBO(long id, Long accountId, Long uidValidity, Long remoteUid, MailConnectionBO connection) {}
