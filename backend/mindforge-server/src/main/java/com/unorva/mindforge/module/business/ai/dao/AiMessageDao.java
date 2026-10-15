package com.unorva.mindforge.module.business.ai.dao;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.unorva.mindforge.module.business.ai.domain.entity.AiMessageEntity;
import com.unorva.mindforge.module.business.ai.domain.vo.MessageVO;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface AiMessageDao extends BaseMapper<AiMessageEntity> {
    List<MessageVO> newest(
            @Param("userId") long userId, @Param("conversationId") long conversationId, @Param("limit") int limit);

    MessageVO find(@Param("userId") long userId, @Param("conversationId") long conversationId, @Param("id") long id);

    int insertMessage(AiMessageEntity entity);

    int deleteConversation(@Param("userId") long userId, @Param("conversationId") long conversationId);
}
