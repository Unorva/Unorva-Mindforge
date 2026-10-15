package com.unorva.mindforge.module.business.blog.dao;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.unorva.mindforge.module.business.blog.domain.bo.BlogCommentBO;
import com.unorva.mindforge.module.business.blog.domain.entity.BlogCommentEntity;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface BlogCommentDao extends BaseMapper<BlogCommentEntity> {
    List<BlogCommentBO> listComments(@Param("userId") long userId);

    long countComment(
            @Param("userId") long userId, @Param("postId") long postId, @Param("id") long id);

    int insertComment(@Param("entity") BlogCommentEntity entity);

    int deletePostComments(@Param("userId") long userId, @Param("postId") long postId);
}
