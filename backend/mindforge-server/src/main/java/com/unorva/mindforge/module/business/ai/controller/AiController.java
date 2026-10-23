package com.unorva.mindforge.module.business.ai.controller;

import com.unorva.mindforge.common.exception.BusinessException;
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
import com.unorva.mindforge.module.business.ai.support.AiStreamControl;

import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;

import lombok.RequiredArgsConstructor;

import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

/** AI sessions and compatible-provider connection checks. */
@RestController
@RequiredArgsConstructor
public class AiController {
    private static final ScheduledExecutorService STREAM_HEARTBEATS =
            Executors.newSingleThreadScheduledExecutor(
                    Thread.ofPlatform().daemon().name("ai-stream-heartbeat").factory());
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

    @PostMapping(value = "/ai/conversations/{id}/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter stream(
            @PathVariable long id, @RequestBody @Valid MessageSaveForm param, HttpServletResponse response) {
        // Authentication context belongs to the HTTP thread, never the background generator.
        long userId = CurrentUser.id();
        conversationService.validateStreamAccess(userId, id);
        response.setHeader("X-Accel-Buffering", "no");
        response.setHeader("Cache-Control", "no-cache");
        AiStreamControl control = new AiStreamControl();
        SseEmitter emitter = new SseEmitter(190000L);
        emitter.onCompletion(control::cancel);
        emitter.onError(unused -> control.cancel());
        emitter.onTimeout(control::timeout);
        var heartbeat =
                STREAM_HEARTBEATS.scheduleAtFixedRate(
                        () -> {
                            if (control.cancelled()) return;
                            try {
                                emitter.send(SseEmitter.event().comment("keep-alive"));
                            } catch (IOException | IllegalStateException exception) {
                                control.cancel();
                            }
                        },
                        0,
                        5,
                        TimeUnit.SECONDS);
        Thread.ofVirtual()
                .name("ai-conversation-stream")
                .start(
                        () -> {
                            control.attachWorker(Thread.currentThread());
                            try {
                                MessageReplyVO reply =
                                        conversationService.stream(
                                                userId,
                                                id,
                                                param.content(),
                                                event -> {
                                                    try {
                                                        emitter.send(
                                                                SseEmitter.event()
                                                                        .name(event.event())
                                                                        .data(event.data()));
                                                    } catch (IOException | IllegalStateException exception) {
                                                        control.cancel();
                                                        control.checkActive();
                                                    }
                                                },
                                                control);
                                emitter.send(SseEmitter.event().name("done").data(reply));
                            } catch (Exception exception) {
                                if (!control.cancelled() || control.timedOut()) {
                                    String message =
                                            exception instanceof BusinessException
                                                    ? exception.getMessage()
                                                    : "AI 回复生成失败，请重试";
                                    try {
                                        emitter.send(SseEmitter.event().name("error").data(Map.of("message", message)));
                                    } catch (IOException | IllegalStateException ignored) {
                                        control.cancel();
                                    }
                                }
                            } finally {
                                heartbeat.cancel(false);
                                control.release();
                                emitter.complete();
                            }
                        });
        return emitter;
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
