package com.unorva.mindforge.module.business.blog.domain.form;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

public record CommentSaveForm(
        @NotNull @Positive Long postId,
        @NotBlank @Size(max = 5000) String comment,
        @Positive Long parentId) {}
