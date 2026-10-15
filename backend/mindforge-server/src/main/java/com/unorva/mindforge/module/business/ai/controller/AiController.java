package com.unorva.mindforge.module.business.ai.controller;

import com.unorva.mindforge.common.security.support.CurrentUser;
import com.unorva.mindforge.common.web.vo.Result;
import com.unorva.mindforge.module.business.ai.domain.form.ConversationSaveForm;
import com.unorva.mindforge.module.business.ai.domain.form.MessageSaveForm;
import com.unorva.mindforge.module.business.ai.domain.vo.AiConfigVO;
import com.unorva.mindforge.module.business.ai.domain.vo.ConnectionTestVO;
import com.unorva.mindforge.module.business.ai.domain.vo.ConversationVO;
import com.unorva.mindforge.module.business.ai.domain.vo.MessageReplyVO;
import com.unorva.mindforge.module.business.ai.domain.vo.MessageVO;
import com.unorva.mindforge.module.business.ai.service.AiConversationService;

import jakarta.validation.Valid;

import lombok.RequiredArgsConstructor;

import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/** AI sessions and compatible-provider connection checks. */
@RestController
@RequiredArgsConstructor
public class AiController {
    private final AiConversationService conversationService;

    @GetMapping("/ai/config")
    public Result<AiConfigVO> config() {
        return Result.success(conversationService.config(CurrentUser.id()));
    }

    @GetMapping("/ai/conversations")
    public Result<List<ConversationVO>> list() {
        return Result.success(conversationService.conversations(CurrentUser.id()));
    }

    @PostMapping("/ai/conversations")
    public Result<ConversationVO> create(@RequestBody @Valid ConversationSaveForm param) {
        return Result.success(conversationService.create(CurrentUser.id(), param.title()));
    }

    @GetMapping("/ai/conversations/{id}/messages")
    public Result<List<MessageVO>> messages(@PathVariable long id) {
        return Result.success(conversationService.messages(CurrentUser.id(), id));
    }

    @PostMapping("/ai/conversations/{id}/messages")
    public Result<MessageReplyVO> send(@PathVariable long id, @RequestBody @Valid MessageSaveForm param) {
        return Result.success(conversationService.send(CurrentUser.id(), id, param.content()));
    }

    @DeleteMapping("/ai/conversations/{id}")
    public Result<Void> delete(@PathVariable long id) {
        conversationService.delete(CurrentUser.id(), id);
        return Result.success();
    }

    @PostMapping({"/ai/test", "/api/ai/test"})
    public Result<ConnectionTestVO> testConnection() {
        return Result.success(conversationService.testConnection(CurrentUser.id()));
    }
}
