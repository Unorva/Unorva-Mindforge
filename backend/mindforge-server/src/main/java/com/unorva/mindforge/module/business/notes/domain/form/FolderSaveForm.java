package com.unorva.mindforge.module.business.notes.domain.form;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record FolderSaveForm(
        @NotBlank @Size(max = 120) String name, @Size(max = 64) String parentId) {}
