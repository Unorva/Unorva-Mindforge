package com.unorva.mindforge.module.business.blog.domain.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;

import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("mf_blog_comment")
public class BlogCommentEntity {
    @TableId(type = IdType.AUTO)
    private Long id;

    private Long userId;
    private Long postId;
    private Long parentId;
    private String content;
    private LocalDateTime createdAt;
}
