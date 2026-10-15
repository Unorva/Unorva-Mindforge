package com.unorva.mindforge.module.business.blog.dao;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.unorva.mindforge.module.business.blog.domain.bo.BlogPostBO;
import com.unorva.mindforge.module.business.blog.domain.entity.BlogPostEntity;
import com.unorva.mindforge.module.business.blog.domain.vo.ProfileVO;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface BlogPostDao extends BaseMapper<BlogPostEntity> {
    ProfileVO findAuthor(@Param("userId") long userId);

    List<BlogPostBO> listPosts(@Param("userId") long userId);

    Long lockPost(@Param("userId") long userId, @Param("id") long id);

    int insertPost(@Param("entity") BlogPostEntity entity);

    int updatePost(@Param("entity") BlogPostEntity entity);

    int deletePost(@Param("userId") long userId, @Param("id") long id);
}
