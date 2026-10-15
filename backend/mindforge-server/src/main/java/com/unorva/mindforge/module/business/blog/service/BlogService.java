package com.unorva.mindforge.module.business.blog.service;

import com.unorva.mindforge.common.exception.BusinessErrorCode;
import com.unorva.mindforge.common.exception.BusinessException;
import com.unorva.mindforge.module.business.blog.domain.bo.BlogCommentBO;
import com.unorva.mindforge.module.business.blog.domain.bo.BlogSnapshotBO;
import com.unorva.mindforge.module.business.blog.domain.form.BlogSaveForm;
import com.unorva.mindforge.module.business.blog.domain.form.CommentSaveForm;
import com.unorva.mindforge.module.business.blog.domain.vo.BlogVO;
import com.unorva.mindforge.module.business.blog.domain.vo.CommentVO;
import com.unorva.mindforge.module.business.blog.domain.vo.ProfileVO;
import com.unorva.mindforge.module.business.blog.manager.BlogManager;

import lombok.RequiredArgsConstructor;

import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/** Blog input rules and presentation of posts with threaded comments. */
@Service
@RequiredArgsConstructor
public class BlogService {
    private final BlogManager manager;

    public List<BlogVO> list(long userId) {
        return present(userId, manager.snapshot(userId));
    }

    public List<BlogVO> save(long userId, BlogSaveForm form, boolean updating) {
        if (updating && (form.id() == null || form.id() <= 0)) {
            throw new BusinessException("请选择要修改的文章", BusinessErrorCode.INVALID_INPUT);
        }
        return present(userId, manager.save(userId, form, updating));
    }

    public List<BlogVO> delete(long userId, long id) {
        return present(userId, manager.delete(userId, id));
    }

    public List<BlogVO> comment(long userId, CommentSaveForm form) {
        return present(userId, manager.comment(userId, form));
    }

    private List<BlogVO> present(long userId, BlogSnapshotBO snapshot) {
        ProfileVO author =
                snapshot.author() == null ? new ProfileVO(userId, "我的工作台", "") : snapshot.author();
        Map<Long, CommentVO> commentsById = new HashMap<>();
        Map<Long, List<CommentVO>> postComments = new HashMap<>();
        for (BlogCommentBO relationship : snapshot.comments()) {
            commentsById.put(
                    relationship.id(),
                    new CommentVO(
                            relationship.id(),
                            author,
                            relationship.createdAt(),
                            relationship.content(),
                            new ArrayList<>()));
        }
        for (BlogCommentBO relationship : snapshot.comments()) {
            CommentVO comment = commentsById.get(relationship.id());
            CommentVO parent =
                    relationship.parentId() == null
                            ? null
                            : commentsById.get(relationship.parentId());
            if (parent == null) {
                postComments
                        .computeIfAbsent(relationship.postId(), unused -> new ArrayList<>())
                        .add(comment);
            } else {
                parent.replies().add(comment);
            }
        }
        return snapshot.posts().stream()
                .map(
                        post ->
                                new BlogVO(
                                        post.id(),
                                        post.title(),
                                        post.content(),
                                        post.coverImg(),
                                        post.createdAt(),
                                        post.viewCount(),
                                        post.shareCount(),
                                        post.category(),
                                        post.featured(),
                                        author,
                                        postComments.getOrDefault(post.id(), List.of()),
                                        post.published()))
                .toList();
    }
}
