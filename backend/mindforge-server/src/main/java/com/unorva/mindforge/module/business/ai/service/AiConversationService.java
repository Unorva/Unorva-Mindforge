package com.unorva.mindforge.module.business.ai.service;

import com.unorva.mindforge.common.exception.BusinessErrorCode;
import com.unorva.mindforge.common.exception.BusinessException;
import com.unorva.mindforge.module.business.ai.domain.bo.ProviderCredentialBO;
import com.unorva.mindforge.module.business.ai.domain.vo.*;
import com.unorva.mindforge.module.business.ai.manager.AiConversationManager;
import com.unorva.mindforge.module.business.ai.manager.AiCredentialManager;
import com.unorva.mindforge.module.business.ai.manager.AiProviderManager;

import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.concurrent.locks.ReentrantLock;

/** Orchestrates chat replies with explicit owner IDs and no transaction around provider transport. */
@Service
public class AiConversationService {
    private static final int MAX_CONTEXT_CHARACTERS = 64000;
    private static final int LOCK_STRIPES = 256;
    private final AiConversationManager conversations;
    private final AiSettingsService settingsService;
    private final AiCredentialManager credentials;
    private final AiProviderManager provider;
    private final ReentrantLock[] conversationLocks = new ReentrantLock[LOCK_STRIPES];

    public AiConversationService(
            AiConversationManager conversations,
            AiSettingsService settingsService,
            AiCredentialManager credentials,
            AiProviderManager provider) {
        this.conversations = conversations;
        this.settingsService = settingsService;
        this.credentials = credentials;
        this.provider = provider;
        for (int index = 0; index < conversationLocks.length; index++) conversationLocks[index] = new ReentrantLock();
    }

    public AiConfigVO config(long userId) {
        AiSettingsVO settings = settingsService.get(userId);
        boolean configured = settings.configured() && StringUtils.hasText(settings.model());
        return new AiConfigVO(
                configured,
                settings.provider(),
                settings.model(),
                configured ? List.of("conversation-storage", "chat-completions") : List.of("conversation-storage"));
    }

    public List<ConversationVO> conversations(long userId) {
        return conversations.list(userId);
    }

    public ConversationVO create(long userId, String title) {
        return conversations.create(userId, StringUtils.hasText(title) ? title.trim() : "新对话");
    }

    public List<MessageVO> messages(long userId, long id) {
        conversations.requireConversation(userId, id, false);
        List<MessageVO> result = new ArrayList<>(conversations.newestMessages(userId, id, 500));
        Collections.reverse(result);
        return result;
    }

    public void delete(long userId, long id) {
        conversations.delete(userId, id);
    }

    public MessageReplyVO send(long userId, long conversationId, String content) {
        conversations.requireConversation(userId, conversationId, false);
        ReentrantLock lock = conversationLocks[Math.floorMod(Long.hashCode(conversationId), LOCK_STRIPES)];
        if (!lock.tryLock()) throw new BusinessException("此会话仍在生成回复，请等待完成", BusinessErrorCode.CONFLICT);
        try {
            AiSettingsVO settings = settingsService.get(userId);
            ProviderCredentialBO credential = credentials.requireCredential(userId);
            List<MessageVO> history = conversations.newestMessages(userId, conversationId, 24);
            String prompt = content.trim();
            String reply = provider.complete(credential, settings, context(settings, history, prompt), false);
            return conversations.saveReply(userId, conversationId, prompt, reply);
        } finally {
            lock.unlock();
        }
    }

    public ConnectionTestVO testConnection(long userId) {
        AiSettingsVO settings = settingsService.get(userId);
        provider.complete(
                credentials.requireCredential(userId),
                settings,
                List.of(Map.of("role", "user", "content", "Reply OK.")),
                true);
        return new ConnectionTestVO(true, settings.provider(), settings.model(), "已收到兼容接口的真实响应");
    }

    private static List<Map<String, String>> context(
            AiSettingsVO settings, List<MessageVO> newestFirst, String prompt) {
        String systemPrompt = settings.systemPrompt() == null ? "" : settings.systemPrompt();
        int characters = prompt.length() + systemPrompt.length();
        List<Map<String, String>> selected = new ArrayList<>();
        for (MessageVO message : newestFirst) {
            if (characters + message.content().length() > MAX_CONTEXT_CHARACTERS) break;
            characters += message.content().length();
            selected.add(Map.of("role", message.role(), "content", message.content()));
        }
        Collections.reverse(selected);
        if (StringUtils.hasText(systemPrompt)) selected.addFirst(Map.of("role", "system", "content", systemPrompt));
        selected.add(Map.of("role", "user", "content", prompt));
        return selected;
    }
}
