package com.unorva.mindforge.module.system.settings.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.unorva.mindforge.module.business.ai.domain.vo.AiSettingsVO;
import com.unorva.mindforge.module.business.ai.service.AiSettingsService;
import com.unorva.mindforge.module.system.settings.domain.dto.AppOptionsDTO;
import com.unorva.mindforge.module.system.settings.domain.dto.NotificationSettingsDTO;
import com.unorva.mindforge.module.system.settings.domain.form.SecuritySettingsForm;
import com.unorva.mindforge.module.system.settings.domain.vo.SettingsVO;
import com.unorva.mindforge.module.system.settings.manager.SettingsManager;
import com.unorva.mindforge.module.system.settings.manager.SettingsSessionManager;

import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import tools.jackson.databind.exc.MismatchedInputException;
import tools.jackson.databind.json.JsonMapper;

import java.util.List;
import java.util.Map;

/** Existing preferences and explicitly scoped session operations retain their wire contracts. */
class SettingsServiceTest {
    private final SettingsManager settings = mock(SettingsManager.class);
    private final AiSettingsService ai = mock(AiSettingsService.class);
    private final SettingsSessionManager sessions = mock(SettingsSessionManager.class);
    private final JsonMapper json = JsonMapper.builder().build();
    private final SettingsService service = new SettingsService(settings, ai, sessions, json);

    @Test
    void aggregatesAiOwnedSettingsAndExistingPreferenceJson() {
        AiSettingsVO aiValue = mock(AiSettingsVO.class);
        when(ai.get(7L)).thenReturn(aiValue);
        when(settings.sections(7L))
                .thenReturn(
                        Map.of(
                                "apps",
                                "[]",
                                "notifications",
                                "{\"emailNotifications\":true,\"inAppNotifications\":false}",
                                "reports",
                                "{\"weekStartsOn\":\"星期日\"}",
                                "security",
                                "{\"twoFactor\":false,\"loginAlerts\":true,\"sessionTimeout\":\"2 小时\",\"activeSessions\":[]}"));
        when(settings.emails(7L)).thenReturn(List.of());
        SettingsVO result = service.get(7L);
        assertSame(aiValue, result.ai());
        assertEquals(List.of(), result.apps());
        assertEquals("星期日", result.reports().weekStartsOn());
        assertEquals("2 小时", result.security().sessionTimeout());
        assertEquals(1, result.security().activeSessions().size());
        assertEquals(new NotificationSettingsDTO(true, false, true, true, false), result.notifications());
        verify(ai).get(7L);
    }

    @Test
    void fillsMissingPreferenceAndNestedAppFieldsWhilePreservingSavedValues() {
        when(settings.sections(7L))
                .thenReturn(
                        Map.of(
                                "apps",
                                "[{\"id\":\"notes\",\"enabled\":false,\"options\":{\"notify\":true}}]",
                                "notifications",
                                "{\"projectUpdates\":false}",
                                "reports",
                                "{}",
                                "security",
                                "{\"loginAlerts\":true}"));
        when(settings.emails(7L)).thenReturn(List.of());
        SettingsVO result = service.get(7L);
        assertEquals(new NotificationSettingsDTO(false, true, true, false, false), result.notifications());
        assertEquals("星期一", result.reports().weekStartsOn());
        assertEquals("8 小时", result.security().sessionTimeout());
        assertTrue(result.security().loginAlerts());
        assertFalse(result.security().twoFactor());
        assertEquals(1, result.apps().size());
        assertEquals("笔记", result.apps().getFirst().name());
        assertFalse(result.apps().getFirst().enabled());
        assertEquals(new AppOptionsDTO("手动", true, false), result.apps().getFirst().options());
    }

    @Test
    void doesNotSilentlyCoerceExplicitPrimitiveNullInStoredPreferences() {
        when(settings.sections(7L)).thenReturn(Map.of("notifications", "{\"projectUpdates\":null}"));
        assertThrows(MismatchedInputException.class, () -> service.get(7L));
    }

    @Test
    void renewsOnlyControllerSuppliedTokenAndPersistsSafeSecurityPreferences() {
        service.saveSecurity(7L, "request-token", new SecuritySettingsForm(false, true, "2 小时", List.of()));
        verify(sessions).renew("request-token", 7200L);
        ArgumentCaptor<String> stored = ArgumentCaptor.forClass(String.class);
        verify(settings).saveSection(eq(7L), eq("security_json"), stored.capture());
        assertTrue(json.readTree(stored.getValue()).path("loginAlerts").asBoolean());
        assertFalse(json.readTree(stored.getValue()).path("twoFactor").asBoolean());
        assertEquals("2 小时", json.readTree(stored.getValue()).path("sessionTimeout").asString());
    }
}
