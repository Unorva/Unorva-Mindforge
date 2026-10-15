package com.unorva.mindforge.module.business.ai.manager;

import static com.unorva.mindforge.common.datasource.support.DaoSupport.requireChanged;

import com.unorva.mindforge.common.exception.BusinessErrorCode;
import com.unorva.mindforge.common.exception.BusinessException;
import com.unorva.mindforge.module.business.ai.dao.AiConversationDao;
import com.unorva.mindforge.module.business.ai.dao.AiMessageDao;
import com.unorva.mindforge.module.business.ai.domain.entity.AiConversationEntity;
import com.unorva.mindforge.module.business.ai.domain.entity.AiMessageEntity;
import com.unorva.mindforge.module.business.ai.domain.vo.ConversationVO;
import com.unorva.mindforge.module.business.ai.domain.vo.MessageReplyVO;
import com.unorva.mindforge.module.business.ai.domain.vo.MessageVO;

import lombok.RequiredArgsConstructor;

import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Component
@RequiredArgsConstructor
public class AiConversationManager {
    private final AiConversationDao conversations;
    private final AiMessageDao messages;

    public List<ConversationVO> list(long userId) {
        return conversations.list(userId);
    }

    public ConversationVO requireConversation(long userId, long id, boolean lock) {
        ConversationVO value = conversations.find(userId, id, lock);
        if (value == null) throw new BusinessException(BusinessErrorCode.NOT_FOUND);
        return value;
    }

    public List<MessageVO> newestMessages(long userId, long conversationId, int limit) {
        return messages.newest(userId, conversationId, limit);
    }

    @Transactional(rollbackFor = Exception.class)
    public ConversationVO create(long userId, String title) {
        AiConversationEntity entity = new AiConversationEntity();
        entity.setUserId(userId);
        entity.setTitle(title);
        requireChanged(conversations.insertConversation(entity));
        if (entity.getId() == null) throw new BusinessException("保存失败，请稍后重试", BusinessErrorCode.CONFLICT);
        return requireConversation(userId, entity.getId(), false);
    }

    @Transactional(rollbackFor = Exception.class)
    public void delete(long userId, long id) {
        requireConversation(userId, id, true);
        messages.deleteConversation(userId, id);
        requireChanged(conversations.deleteOwned(userId, id));
    }

    /** Store the completed reply atomically; no provider call participates in this transaction. */
    @Transactional(rollbackFor = Exception.class)
    public MessageReplyVO saveReply(long userId, long conversationId, String prompt, String reply) {
        ConversationVO current = requireConversation(userId, conversationId, true);
        long userMessage = insertMessage(userId, conversationId, "user", prompt);
        long assistantMessage = insertMessage(userId, conversationId, "assistant", reply);
        String title =
                "新对话".equals(current.title()) ? prompt.substring(0, Math.min(60, prompt.length())) : current.title();
        requireChanged(conversations.updateTitle(userId, conversationId, title));
        return new MessageReplyVO(
                requireMessage(userId, conversationId, userMessage),
                requireMessage(userId, conversationId, assistantMessage),
                requireConversation(userId, conversationId, false));
    }

    private long insertMessage(long userId, long conversationId, String role, String content) {
        AiMessageEntity entity = new AiMessageEntity();
        entity.setUserId(userId);
        entity.setConversationId(conversationId);
        entity.setRole(role);
        entity.setContent(content);
        requireChanged(messages.insertMessage(entity));
        if (entity.getId() == null) throw new BusinessException("保存失败，请稍后重试", BusinessErrorCode.CONFLICT);
        return entity.getId();
    }

    private MessageVO requireMessage(long userId, long conversationId, long id) {
        MessageVO value = messages.find(userId, conversationId, id);
        if (value == null) throw new BusinessException(BusinessErrorCode.NOT_FOUND);
        return value;
    }
}
