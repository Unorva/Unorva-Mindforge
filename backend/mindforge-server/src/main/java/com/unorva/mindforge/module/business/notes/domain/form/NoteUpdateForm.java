package com.unorva.mindforge.module.business.notes.domain.form;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

public record NoteUpdateForm(
        @NotNull @Positive Long id,
        @Size(max = 200) String title,
        @Size(max = 4_000_000) String content,
        @Size(max = 40) String color,
        @Size(max = 64) String folderId,
        Boolean deleted) {}
