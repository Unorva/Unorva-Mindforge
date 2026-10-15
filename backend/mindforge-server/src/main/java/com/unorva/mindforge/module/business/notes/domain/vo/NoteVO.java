package com.unorva.mindforge.module.business.notes.domain.vo;

import java.time.LocalDateTime;

public record NoteVO(
        long id,
        String title,
        String content,
        String color,
        String folderId,
        LocalDateTime datef,
        boolean deleted) {}
