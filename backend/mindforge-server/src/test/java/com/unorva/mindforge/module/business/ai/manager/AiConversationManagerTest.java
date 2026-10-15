package com.unorva.mindforge.module.business.ai.manager;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.unorva.mindforge.module.business.ai.dao.AiConversationDao;
import com.unorva.mindforge.module.business.ai.dao.AiMessageDao;
import com.unorva.mindforge.module.business.ai.domain.entity.AiMessageEntity;
import com.unorva.mindforge.module.business.ai.domain.vo.*;

import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.time.LocalDateTime;

class AiConversationManagerTest {
    @Test
    void savesBothRolesAndUpdatesDefaultTitleUnderOwnedConversationLock() {
        AiConversationDao conversations = mock(AiConversationDao.class);
        AiMessageDao messages = mock(AiMessageDao.class);
        LocalDateTime now = LocalDateTime.of(2026, 10, 9, 12, 0);
        ConversationVO conversation = new ConversationVO(18L, "新对话", now, now);
        when(conversations.find(7L, 18L, true)).thenReturn(conversation);
        when(conversations.find(7L, 18L, false)).thenReturn(conversation);
        when(messages.insertMessage(any()))
                .thenAnswer(
                        invocation -> {
                            AiMessageEntity entity = invocation.getArgument(0);
                            entity.setId("user".equals(entity.getRole()) ? 21L : 22L);
                            return 1;
                        });
        when(conversations.updateTitle(7L, 18L, "你好")).thenReturn(1);
        when(messages.find(7L, 18L, 21L)).thenReturn(new MessageVO(21L, "user", "你好", now));
        when(messages.find(7L, 18L, 22L)).thenReturn(new MessageVO(22L, "assistant", "回复", now));
        MessageReplyVO reply = new AiConversationManager(conversations, messages).saveReply(7L, 18L, "你好", "回复");
        assertEquals("你好", reply.userMessage().content());
        assertEquals("回复", reply.assistantMessage().content());
        ArgumentCaptor<AiMessageEntity> captured = ArgumentCaptor.forClass(AiMessageEntity.class);
        verify(messages, times(2)).insertMessage(captured.capture());
        assertTrue(
                captured.getAllValues().stream()
                        .allMatch(entity -> entity.getUserId() == 7L && entity.getConversationId() == 18L));
        verify(conversations).find(7L, 18L, true);
        verify(conversations).updateTitle(7L, 18L, "你好");
    }
}
