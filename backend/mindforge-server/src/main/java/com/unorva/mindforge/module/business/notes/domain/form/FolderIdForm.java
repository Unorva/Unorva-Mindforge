package com.unorva.mindforge.module.business.notes.domain.form;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record FolderIdForm(@NotBlank @Size(max = 64) String id) {}
