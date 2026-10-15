package com.unorva.mindforge.module.business.ai.domain.vo;

import java.time.LocalDateTime;

public record ConversationVO(long id, String title, LocalDateTime createdAt, LocalDateTime updatedAt) {}
