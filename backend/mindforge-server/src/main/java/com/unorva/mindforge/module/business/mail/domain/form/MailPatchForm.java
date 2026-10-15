package com.unorva.mindforge.module.business.mail.domain.form;

import jakarta.validation.constraints.Pattern;

public record MailPatchForm(
        @Pattern(regexp = "inbox|draft|sent|archive|trash") String folder, Boolean starred, Boolean unread) {}
