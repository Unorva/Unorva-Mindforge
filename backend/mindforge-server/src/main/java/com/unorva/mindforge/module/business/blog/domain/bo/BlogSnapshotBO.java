package com.unorva.mindforge.module.business.blog.domain.bo;

import com.unorva.mindforge.module.business.blog.domain.vo.ProfileVO;

import java.util.List;

/** Database records captured together before a mutation transaction releases its post lock. */
public record BlogSnapshotBO(
        ProfileVO author, List<BlogPostBO> posts, List<BlogCommentBO> comments) {}
