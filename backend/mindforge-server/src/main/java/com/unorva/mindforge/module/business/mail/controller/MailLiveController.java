package com.unorva.mindforge.module.business.mail.controller;

import com.unorva.mindforge.common.security.support.CurrentUser;
import com.unorva.mindforge.module.business.mail.service.MailLiveService;

import jakarta.servlet.http.HttpServletResponse;

import lombok.RequiredArgsConstructor;

import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

/** Authenticated workspace-wide updates; credentials never appear in the stream URL. */
@RestController
@RequiredArgsConstructor
public class MailLiveController {
    private final MailLiveService live;

    @GetMapping(value = "/mail/events", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter events(HttpServletResponse response) {
        long userId = CurrentUser.id();
        response.setHeader("Cache-Control", "no-cache, no-store");
        response.setHeader("X-Accel-Buffering", "no");
        return live.subscribe(userId);
    }
}
