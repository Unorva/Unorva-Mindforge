package com.unorva.mindforge.module.business.mail.domain.bo;

import lombok.Data;

/** Small persisted content projection; rich bodies stay in the database during polling. */
@Data
public class MailCachedBodyBO {
    private long uidValidity;
    private long uid;
    private String body;
}
