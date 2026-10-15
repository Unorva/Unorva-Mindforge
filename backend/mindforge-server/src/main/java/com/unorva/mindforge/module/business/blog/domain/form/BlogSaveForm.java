package com.unorva.mindforge.module.business.blog.domain.form;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record BlogSaveForm(
        Long id,
        @NotBlank @Size(max = 200) String title,
        @Size(max = 200000) String content,
        @Size(max = 1000) String coverImg,
        @Size(max = 80) String category,
        Boolean featured,
        Boolean published) {}
