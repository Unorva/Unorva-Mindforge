package com.unorva.mindforge.module.business.ai.dao;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.unorva.mindforge.module.business.ai.domain.entity.AiConversationEntity;
import com.unorva.mindforge.module.business.ai.domain.vo.ConversationVO;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface AiConversationDao extends BaseMapper<AiConversationEntity> {
    List<ConversationVO> list(@Param("userId") long userId);

    ConversationVO find(@Param("userId") long userId, @Param("id") long id, @Param("lock") boolean lock);

    int insertConversation(AiConversationEntity entity);

    int deleteOwned(@Param("userId") long userId, @Param("id") long id);

    int updateTitle(@Param("userId") long userId, @Param("id") long id, @Param("title") String title);
}
