package com.unorva.mindforge.module.business.ai.domain.vo;

public record MessageReplyVO(MessageVO userMessage, MessageVO assistantMessage, ConversationVO conversation) {}
