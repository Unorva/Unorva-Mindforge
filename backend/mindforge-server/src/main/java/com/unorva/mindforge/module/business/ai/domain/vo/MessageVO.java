package com.unorva.mindforge.module.business.ai.domain.vo;

import java.time.LocalDateTime;

public record MessageVO(long id, String role, String content, LocalDateTime createdAt) {}
