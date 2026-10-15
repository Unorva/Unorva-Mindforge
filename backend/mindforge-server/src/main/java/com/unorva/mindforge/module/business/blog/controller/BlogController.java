package com.unorva.mindforge.module.business.blog.controller;

import com.unorva.mindforge.common.security.support.CurrentUser;
import com.unorva.mindforge.common.web.form.IdForm;
import com.unorva.mindforge.common.web.vo.Result;
import com.unorva.mindforge.module.business.blog.domain.form.BlogSaveForm;
import com.unorva.mindforge.module.business.blog.domain.form.CommentSaveForm;
import com.unorva.mindforge.module.business.blog.domain.vo.BlogVO;
import com.unorva.mindforge.module.business.blog.service.BlogService;

import jakarta.validation.Valid;

import lombok.RequiredArgsConstructor;

import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/** Personal blog CRUD and comments. */
@RestController
@RequiredArgsConstructor
public class BlogController {
    private final BlogService blogService;

    @GetMapping("/api/data/blog/BlogPosts")
    public Result<List<BlogVO>> list() {
        return Result.success(blogService.list(CurrentUser.id()));
    }

    @PostMapping("/api/blog/add")
    public Result<List<BlogVO>> create(@RequestBody @Valid BlogSaveForm param) {
        return Result.success(blogService.save(CurrentUser.id(), param, false));
    }

    @PutMapping("/api/blog/update")
    public Result<List<BlogVO>> update(@RequestBody @Valid BlogSaveForm param) {
        return Result.success(blogService.save(CurrentUser.id(), param, true));
    }

    @DeleteMapping("/api/blog/delete")
    public Result<List<BlogVO>> delete(@RequestBody @Valid IdForm param) {
        return Result.success(blogService.delete(CurrentUser.id(), param.id()));
    }

    @PostMapping("/api/blog/comments/add")
    public Result<List<BlogVO>> comment(@RequestBody @Valid CommentSaveForm param) {
        return Result.success(blogService.comment(CurrentUser.id(), param));
    }
}
