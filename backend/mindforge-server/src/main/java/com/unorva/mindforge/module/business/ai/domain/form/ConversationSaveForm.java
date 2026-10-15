package com.unorva.mindforge.module.business.ai.domain.form;

import jakarta.validation.constraints.Size;

public record ConversationSaveForm(@Size(max = 200) String title) {}
