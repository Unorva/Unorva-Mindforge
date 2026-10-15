package com.unorva.mindforge.module.business.blog.manager;

import com.unorva.mindforge.common.datasource.support.DaoSupport;
import com.unorva.mindforge.module.business.blog.dao.BlogCommentDao;
import com.unorva.mindforge.module.business.blog.dao.BlogPostDao;
import com.unorva.mindforge.module.business.blog.domain.bo.BlogSnapshotBO;
import com.unorva.mindforge.module.business.blog.domain.entity.BlogCommentEntity;
import com.unorva.mindforge.module.business.blog.domain.entity.BlogPostEntity;
import com.unorva.mindforge.module.business.blog.domain.form.BlogSaveForm;
import com.unorva.mindforge.module.business.blog.domain.form.CommentSaveForm;

import lombok.RequiredArgsConstructor;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Coordinates post locks and comment mutations across the two blog tables. */
@Service
@RequiredArgsConstructor
public class BlogManager {
    private final BlogPostDao postDao;
    private final BlogCommentDao commentDao;

    @Transactional(readOnly = true)
    public BlogSnapshotBO snapshot(long userId) {
        return new BlogSnapshotBO(
                postDao.findAuthor(userId),
                postDao.listPosts(userId),
                commentDao.listComments(userId));
    }

    @Transactional(rollbackFor = Exception.class)
    public BlogSnapshotBO save(long userId, BlogSaveForm form, boolean updating) {
        BlogPostEntity entity = new BlogPostEntity();
        entity.setId(form.id());
        entity.setUserId(userId);
        entity.setTitle(form.title().trim());
        entity.setContent(value(form.content(), ""));
        entity.setCoverImg(value(form.coverImg(), ""));
        entity.setCategory(value(form.category(), "未分类"));
        entity.setFeatured(Boolean.TRUE.equals(form.featured()));
        entity.setPublished(Boolean.TRUE.equals(form.published()));
        if (updating) {
            lockPost(userId, form.id());
            DaoSupport.requireChanged(postDao.updatePost(entity));
        } else {
            postDao.insertPost(entity);
        }
        return snapshot(userId);
    }

    @Transactional(rollbackFor = Exception.class)
    public BlogSnapshotBO delete(long userId, long id) {
        lockPost(userId, id);
        commentDao.deletePostComments(userId, id);
        DaoSupport.requireChanged(postDao.deletePost(userId, id));
        return snapshot(userId);
    }

    @Transactional(rollbackFor = Exception.class)
    public BlogSnapshotBO comment(long userId, CommentSaveForm form) {
        lockPost(userId, form.postId());
        if (form.parentId() != null) {
            DaoSupport.requireExists(
                    commentDao.countComment(userId, form.postId(), form.parentId()));
        }
        BlogCommentEntity entity = new BlogCommentEntity();
        entity.setUserId(userId);
        entity.setPostId(form.postId());
        entity.setParentId(form.parentId());
        entity.setContent(form.comment().trim());
        commentDao.insertComment(entity);
        return snapshot(userId);
    }

    private void lockPost(long userId, long id) {
        DaoSupport.requireExists(postDao.lockPost(userId, id) == null ? 0 : 1);
    }

    private static String value(String supplied, String fallback) {
        return supplied == null ? fallback : supplied;
    }
}
