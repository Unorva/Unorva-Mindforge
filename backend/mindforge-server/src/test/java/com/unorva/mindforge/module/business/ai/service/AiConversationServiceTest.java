package com.unorva.mindforge.module.business.ai.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.unorva.mindforge.common.exception.BusinessErrorCode;
import com.unorva.mindforge.common.exception.BusinessException;
import com.unorva.mindforge.module.business.ai.domain.bo.ProviderCredentialBO;
import com.unorva.mindforge.module.business.ai.domain.vo.*;
import com.unorva.mindforge.module.business.ai.manager.*;

import org.junit.jupiter.api.Test;
import org.mockito.InOrder;

import java.time.LocalDateTime;
import java.util.List;

class AiConversationServiceTest {
    private final AiConversationManager conversations = mock(AiConversationManager.class);
    private final AiSettingsService settingsService = mock(AiSettingsService.class);
    private final AiCredentialManager credentials = mock(AiCredentialManager.class);
    private final AiProviderManager provider = mock(AiProviderManager.class);
    private final AiConversationService service =
            new AiConversationService(conversations, settingsService, credentials, provider);

    @Test
    void completesNetworkRequestBeforeOpeningPersistenceTransaction() {
        LocalDateTime now = LocalDateTime.of(2026, 10, 9, 12, 0);
        ConversationVO conversation = new ConversationVO(18L, "新对话", now, now);
        AiSettingsVO settings = mock(AiSettingsVO.class);
        ProviderCredentialBO credential = new ProviderCredentialBO("https://example.test/v1", "key");
        MessageReplyVO reply =
                new MessageReplyVO(
                        new MessageVO(21L, "user", "你好", now),
                        new MessageVO(22L, "assistant", "模型回复", now),
                        conversation);
        when(conversations.requireConversation(7L, 18L, false)).thenReturn(conversation);
        when(settingsService.get(7L)).thenReturn(settings);
        when(credentials.requireCredential(7L)).thenReturn(credential);
        when(conversations.newestMessages(7L, 18L, 24)).thenReturn(List.of());
        when(provider.complete(eq(credential), eq(settings), anyList(), eq(false))).thenReturn("模型回复");
        when(conversations.saveReply(7L, 18L, "你好", "模型回复")).thenReturn(reply);
        assertEquals(reply, service.send(7L, 18L, "  你好  "));
        InOrder order = inOrder(provider, conversations);
        order.verify(provider).complete(eq(credential), eq(settings), anyList(), eq(false));
        order.verify(conversations).saveReply(7L, 18L, "你好", "模型回复");
    }

    @Test
    void rejectsUnownedConversationBeforeReadingCredentialsOrSendingNetworkRequest() {
        when(conversations.requireConversation(7L, 18L, false))
                .thenThrow(new BusinessException(BusinessErrorCode.NOT_FOUND));
        assertThrows(BusinessException.class, () -> service.send(7L, 18L, "你好"));
        verifyNoInteractions(credentials, provider, settingsService);
        verify(conversations, never()).saveReply(anyLong(), anyLong(), anyString(), anyString());
    }

    @Test
    void providerFailureDoesNotPersistPartialMessages() {
        when(conversations.requireConversation(7L, 18L, false)).thenReturn(mock(ConversationVO.class));
        when(settingsService.get(7L)).thenReturn(mock(AiSettingsVO.class));
        when(credentials.requireCredential(7L)).thenReturn(new ProviderCredentialBO("https://example.test/v1", "key"));
        when(conversations.newestMessages(7L, 18L, 24)).thenReturn(List.of());
        when(provider.complete(any(), any(), anyList(), eq(false)))
                .thenThrow(new BusinessException(BusinessErrorCode.PROVIDER_FAILED));
        assertThrows(BusinessException.class, () -> service.send(7L, 18L, "你好"));
        verify(conversations, never()).saveReply(anyLong(), anyLong(), anyString(), anyString());
    }
}
