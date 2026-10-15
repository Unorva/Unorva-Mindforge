package com.unorva.mindforge.module.business.blog.domain.vo;

import java.time.LocalDateTime;
import java.util.List;

public record BlogVO(
        long id,
        String title,
        String content,
        String coverImg,
        LocalDateTime createdAt,
        long view,
        long share,
        String category,
        boolean featured,
        ProfileVO author,
        List<CommentVO> comments,
        boolean published) {}
