package com.unorva.mindforge.module.business.mail.controller;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.unorva.mindforge.common.security.support.CurrentUser;
import com.unorva.mindforge.module.business.mail.service.MailLiveService;

import jakarta.servlet.http.HttpServletResponse;

import org.junit.jupiter.api.Test;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

class MailLiveControllerTest {
    @Test
    void subscribesOnlyTheAuthenticatedOwnerAndDisablesProxyBuffering() {
        MailLiveService live = mock(MailLiveService.class);
        HttpServletResponse response = mock(HttpServletResponse.class);
        SseEmitter emitter = new SseEmitter(300_000L);
        when(live.subscribe(7L)).thenReturn(emitter);
        try (var currentUser = mockStatic(CurrentUser.class)) {
            currentUser.when(CurrentUser::id).thenReturn(7L);
            assertSame(emitter, new MailLiveController(live).events(response));
        }
        verify(live).subscribe(7L);
        verify(response).setHeader("Cache-Control", "no-cache, no-store");
        verify(response).setHeader("X-Accel-Buffering", "no");
    }
}
