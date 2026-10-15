package com.unorva.mindforge.module.business.blog.domain.vo;

import java.time.LocalDateTime;
import java.util.List;

public record CommentVO(
        long id, ProfileVO profile, LocalDateTime time, String comment, List<CommentVO> replies) {}
