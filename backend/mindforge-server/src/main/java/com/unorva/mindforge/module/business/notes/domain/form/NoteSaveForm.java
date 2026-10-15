package com.unorva.mindforge.module.business.notes.domain.form;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record NoteSaveForm(
        Long id,
        @NotBlank @Size(max = 200) String title,
        @Size(max = 200000) String content,
        @Size(max = 40) String color,
        @NotBlank @Size(max = 64) String folderId,
        Boolean deleted) {}
