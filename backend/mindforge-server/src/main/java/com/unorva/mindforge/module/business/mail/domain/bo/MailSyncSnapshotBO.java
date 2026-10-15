package com.unorva.mindforge.module.business.mail.domain.bo;

import java.util.Map;

/**
 * Revisions captured before provider I/O keep an old sync from undoing newer local flag changes.
 */
public record MailSyncSnapshotBO(MailConnectionBO connection, Map<Long, Long> flagVersions) {
    public MailSyncSnapshotBO {
        flagVersions = Map.copyOf(flagVersions);
    }
}
