package com.unorva.mindforge.module.business.blog.domain.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;

import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("mf_blog_post")
public class BlogPostEntity {
    @TableId(type = IdType.AUTO)
    private Long id;

    private Long userId;
    private String title;
    private String content;
    private String coverImg;
    private String category;
    private Boolean featured;
    private Boolean published;
    private Long viewCount;
    private Long shareCount;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
