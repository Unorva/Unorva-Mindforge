package com.unorva.mindforge.module.business.blog.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.unorva.mindforge.common.exception.BusinessErrorCode;
import com.unorva.mindforge.common.exception.BusinessException;
import com.unorva.mindforge.module.business.blog.dao.BlogCommentDao;
import com.unorva.mindforge.module.business.blog.dao.BlogPostDao;
import com.unorva.mindforge.module.business.blog.domain.bo.BlogCommentBO;
import com.unorva.mindforge.module.business.blog.domain.bo.BlogPostBO;
import com.unorva.mindforge.module.business.blog.domain.entity.BlogCommentEntity;
import com.unorva.mindforge.module.business.blog.domain.form.CommentSaveForm;
import com.unorva.mindforge.module.business.blog.domain.vo.BlogVO;
import com.unorva.mindforge.module.business.blog.domain.vo.CommentVO;
import com.unorva.mindforge.module.business.blog.domain.vo.ProfileVO;
import com.unorva.mindforge.module.business.blog.manager.BlogManager;

import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.List;

/** Baseline: nested replies, root fallback for legacy missing parents, and locked post deletion. */
class BlogServiceTest {
    private final BlogPostDao postDao = mock(BlogPostDao.class);
    private final BlogCommentDao commentDao = mock(BlogCommentDao.class);
    private final BlogService service = new BlogService(new BlogManager(postDao, commentDao));

    @Test
    void postsRetainAuthorCommentRepliesAndMissingParentFallback() {
        LocalDateTime createdAt = LocalDateTime.of(2026, 10, 9, 8, 0);
        when(commentDao.listComments(7L))
                .thenReturn(
                        List.of(
                                new BlogCommentBO(1L, 5L, null, "评论", createdAt),
                                new BlogCommentBO(2L, 5L, 1L, "回复", createdAt),
                                new BlogCommentBO(3L, 5L, 99L, "旧评论", createdAt)));
        when(postDao.listPosts(7L))
                .thenReturn(
                        List.of(
                                new BlogPostBO(
                                        5L, "文章", "内容", "", createdAt, 15L, 3L, "技术", true,
                                        false)));
        BlogVO post = service.list(7L).getFirst();
        assertEquals(new ProfileVO(7L, "我的工作台", ""), post.author());
        assertEquals("文章", post.title());
        assertEquals(15L, post.view());
        assertEquals(3L, post.share());
        assertEquals(List.of(1L, 3L), post.comments().stream().map(CommentVO::id).toList());
        assertEquals(
                List.of(2L),
                post.comments().getFirst().replies().stream().map(CommentVO::id).toList());
    }

    @Test
    void rejectsReplyWhenParentDoesNotBelongToTheSamePost() {
        when(postDao.lockPost(7L, 5L)).thenReturn(5L);
        BusinessException exception =
                assertThrows(
                        BusinessException.class,
                        () -> service.comment(7L, new CommentSaveForm(5L, "回复", 9L)));
        assertEquals(BusinessErrorCode.NOT_FOUND, exception.getErrorCode());
        verify(commentDao).countComment(7L, 5L, 9L);
        verify(commentDao, never()).insertComment(any(BlogCommentEntity.class));
        var order = inOrder(postDao, commentDao);
        order.verify(postDao).lockPost(7L, 5L);
        order.verify(commentDao).countComment(7L, 5L, 9L);
    }

    @Test
    void deletingPostLocksParentBeforeDeletingCommentsAndPost() {
        when(postDao.lockPost(7L, 5L)).thenReturn(5L);
        when(postDao.deletePost(7L, 5L)).thenReturn(1);
        when(commentDao.listComments(7L)).thenReturn(List.of());
        when(postDao.listPosts(7L)).thenReturn(List.of());
        service.delete(7L, 5L);
        var order = inOrder(postDao, commentDao);
        order.verify(postDao).lockPost(7L, 5L);
        order.verify(commentDao).deletePostComments(7L, 5L);
        order.verify(postDao).deletePost(7L, 5L);
    }
}
