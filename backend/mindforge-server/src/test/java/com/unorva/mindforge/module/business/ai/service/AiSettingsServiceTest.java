package com.unorva.mindforge.module.business.ai.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.unorva.mindforge.module.business.ai.domain.dto.AiFeaturesDTO;
import com.unorva.mindforge.module.business.ai.domain.form.AiSaveForm;
import com.unorva.mindforge.module.business.ai.domain.vo.AiSettingsVO;
import com.unorva.mindforge.module.business.ai.manager.AiCredentialManager;
import com.unorva.mindforge.module.business.ai.manager.AiSettingsManager;

import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import tools.jackson.databind.exc.MismatchedInputException;
import tools.jackson.databind.json.JsonMapper;

import java.math.BigDecimal;

/** Verifies stored preference compatibility and credential masking after moving AI ownership. */
class AiSettingsServiceTest {
    private final AiSettingsManager settingsManager = mock(AiSettingsManager.class);
    private final AiCredentialManager credentialService = mock(AiCredentialManager.class);
    private final JsonMapper objectMapper = JsonMapper.builder().build();
    private final AiSettingsService service = new AiSettingsService(settingsManager, credentialService, objectMapper);

    @Test
    void readsExistingAiJsonAndTakesCredentialStateFromEncryptedStorage() {
        when(settingsManager.findJson(7L))
                .thenReturn(
                        """
                {"provider":"兼容接口","model":"saved-model","temperature":0.4,"maxTokens":2048,
                 "language":"简体中文","systemPrompt":"保存的提示词",
                 "features":{"smartSummary":true,"autoTag":false,"dailyReviewDraft":false,"emailComposeAssist":true},
                 "baseUrl":"https://old.example/v1","apiKey":"old-visible-value","configured":false}
                """);
        when(credentialService.baseUrl(7L)).thenReturn("https://current.example/v1");
        when(credentialService.configured(7L)).thenReturn(true);

        AiSettingsVO settings = service.get(7L);

        assertEquals("saved-model", settings.model());
        assertEquals(new BigDecimal("0.4"), settings.temperature());
        assertEquals("保存的提示词", settings.systemPrompt());
        assertEquals("https://current.example/v1", settings.baseUrl());
        assertEquals("", settings.apiKey());
        assertTrue(settings.configured());
    }

    @Test
    void retainsDefaultsWhenNoPreferenceRowExists() {
        when(credentialService.baseUrl(11L)).thenReturn("");

        AiSettingsVO settings = service.get(11L);

        assertEquals("OpenAI 兼容", settings.provider());
        assertEquals("", settings.model());
        assertEquals(new BigDecimal("0.7"), settings.temperature());
        assertEquals(4096, settings.maxTokens());
        assertFalse(settings.configured());
        assertEquals("", settings.apiKey());
    }

    @Test
    void fillsNewFieldsInPartialLegacyJsonAndPreservesSavedFeatureOverrides() {
        when(settingsManager.findJson(7L))
                .thenReturn(
                        "{\"model\":\"legacy-model\",\"temperature\":0.2,\"features\":{\"smartSummary\":false,\"autoTag\":true}}");
        when(credentialService.baseUrl(7L)).thenReturn("");

        AiSettingsVO settings = service.get(7L);

        assertEquals("legacy-model", settings.model());
        assertEquals(new BigDecimal("0.2"), settings.temperature());
        assertEquals(4096, settings.maxTokens());
        assertEquals("简体中文", settings.language());
        assertFalse(settings.features().smartSummary());
        assertTrue(settings.features().autoTag());
        assertFalse(settings.features().dailyReviewDraft());
        assertTrue(settings.features().emailComposeAssist());
        assertFalse(settings.configured());
    }

    @Test
    void fillsEntireFeatureSectionWhenLegacyJsonDoesNotIncludeIt() {
        when(settingsManager.findJson(7L)).thenReturn("{\"model\":\"legacy-model\",\"maxTokens\":1024}");
        when(credentialService.baseUrl(7L)).thenReturn("");

        AiSettingsVO settings = service.get(7L);

        assertEquals(1024, settings.maxTokens());
        assertEquals(new AiFeaturesDTO(true, false, false, true), settings.features());
    }

    @Test
    void doesNotTreatExplicitPrimitiveNullAsAMissingStoredField() {
        when(settingsManager.findJson(7L)).thenReturn("{\"maxTokens\":null}");

        assertThrows(MismatchedInputException.class, () -> service.get(7L));
    }

    @Test
    void savesCredentialsAndPreferencesUnderAiLockWithoutPuttingSecretsInJson() {
        AiSaveForm param =
                new AiSaveForm(
                        "  兼容接口  ",
                        " saved-model ",
                        new BigDecimal("0.6"),
                        1024,
                        null,
                        null,
                        new AiFeaturesDTO(true, false, false, true),
                        "https://example.test/v1",
                        "private-key");

        service.save(7L, param);

        ArgumentCaptor<String> json = ArgumentCaptor.forClass(String.class);
        org.mockito.Mockito.verify(settingsManager)
                .save(eq(7L), json.capture(), eq("https://example.test/v1"), eq("private-key"));
        AiSettingsVO stored = objectMapper.readValue(json.getValue(), AiSettingsVO.class);
        assertEquals("兼容接口", stored.provider());
        assertEquals("saved-model", stored.model());
        assertEquals("简体中文", stored.language());
        assertFalse(json.getValue().contains("private-key"));
        assertEquals("", stored.apiKey());
        assertEquals("", stored.baseUrl());
    }

    @Test
    void removesCredentialsUnderSameAiLock() {
        service.removeCredential(7L);

        org.mockito.Mockito.verify(settingsManager).removeCredential(7L);
    }
}
