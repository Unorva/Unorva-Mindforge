package com.unorva.mindforge.module.business.mail.domain.form;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

public record MailSaveForm(
        @Positive Long id,
        @Email @Size(max = 254) String sender,
        @Email @Size(max = 254) String recipient,
        @Size(max = 200) String subject,
        @Size(max = 200000) String body,
        @Pattern(regexp = "inbox|draft|sent|archive|trash") String folder,
        Boolean starred,
        Boolean unread,
        @Positive Long accountId) {
    public MailSaveForm(
            Long id,
            String sender,
            String recipient,
            String subject,
            String body,
            String folder,
            Boolean starred,
            Boolean unread) {
        this(id, sender, recipient, subject, body, folder, starred, unread, null);
    }
}
