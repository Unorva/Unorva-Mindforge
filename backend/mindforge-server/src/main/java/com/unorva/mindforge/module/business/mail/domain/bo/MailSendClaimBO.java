package com.unorva.mindforge.module.business.mail.domain.bo;
/** Durable delivery claim passed from the transaction manager to the SMTP orchestration. */
public record MailSendClaimBO(long id, String token, MailConnectionBO connection) {}
