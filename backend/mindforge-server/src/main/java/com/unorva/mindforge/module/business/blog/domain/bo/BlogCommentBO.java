package com.unorva.mindforge.module.business.blog.domain.bo;

import java.time.LocalDateTime;

/** Stored comment and its parent relationship. */
public record BlogCommentBO(
        long id, long postId, Long parentId, String content, LocalDateTime createdAt) {}
