package com.unorva.mindforge.module.business.mail.domain.bo;

import lombok.Data;

/** Lightweight persisted revision, without downloading cached message bodies. */
@Data
public class MailFlagsVersionBO {
    private Long id;
    private Long flagsVersion;
}
