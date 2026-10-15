package com.unorva.mindforge.module.business.blog.domain.bo;

import java.time.LocalDateTime;

/** Stored post fields, independent of profile and comment-tree assembly. */
public record BlogPostBO(
        long id,
        String title,
        String content,
        String coverImg,
        LocalDateTime createdAt,
        long viewCount,
        long shareCount,
        String category,
        boolean featured,
        boolean published) {}
