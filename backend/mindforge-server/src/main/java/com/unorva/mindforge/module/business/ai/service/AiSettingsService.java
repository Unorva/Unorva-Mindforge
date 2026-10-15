package com.unorva.mindforge.module.business.ai.service;

import com.unorva.mindforge.module.business.ai.domain.dto.AiFeaturesDTO;
import com.unorva.mindforge.module.business.ai.domain.form.AiSaveForm;
import com.unorva.mindforge.module.business.ai.domain.vo.AiSettingsVO;
import com.unorva.mindforge.module.business.ai.manager.AiCredentialManager;
import com.unorva.mindforge.module.business.ai.manager.AiSettingsManager;

import lombok.RequiredArgsConstructor;

import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.node.ObjectNode;

import java.math.BigDecimal;

/** Owns AI preferences and credentials independently of the aggregate settings page. */
@Service
@RequiredArgsConstructor
public class AiSettingsService {
    private static final String DEFAULT_SYSTEM_PROMPT = "你是 Mindforge 工作台的 AI 助手，请用简体中文给出清晰、具体的回答。";
    private final AiSettingsManager settingsManager;
    private final AiCredentialManager credentialService;
    private final ObjectMapper objectMapper;

    public AiSettingsVO get(long userId) {
        String json = settingsManager.findJson(userId);
        AiSettingsVO defaults = defaultPreferences();
        AiSettingsVO preferences =
                StringUtils.hasText(json)
                        ? objectMapper.treeToValue(
                                withDefaults(objectMapper.readTree(json), objectMapper.valueToTree(defaults)),
                                AiSettingsVO.class)
                        : defaults;
        return new AiSettingsVO(
                preferences.provider(),
                preferences.model(),
                preferences.temperature(),
                preferences.maxTokens(),
                preferences.language(),
                preferences.systemPrompt(),
                preferences.features(),
                credentialService.baseUrl(userId),
                "",
                credentialService.configured(userId));
    }

    public void save(long userId, AiSaveForm param) {
        AiSettingsVO preferences =
                new AiSettingsVO(
                        param.provider().trim(),
                        param.model().trim(),
                        param.temperature(),
                        param.maxTokens(),
                        value(param.language(), "简体中文"),
                        value(param.systemPrompt(), DEFAULT_SYSTEM_PROMPT),
                        param.features(),
                        "",
                        "",
                        false);
        settingsManager.save(userId, objectMapper.writeValueAsString(preferences), param.baseUrl(), param.apiKey());
    }

    public void removeCredential(long userId) {
        settingsManager.removeCredential(userId);
    }

    private static AiSettingsVO defaultPreferences() {
        return new AiSettingsVO(
                "OpenAI 兼容",
                "",
                new BigDecimal("0.7"),
                4096,
                "简体中文",
                DEFAULT_SYSTEM_PROMPT,
                new AiFeaturesDTO(true, false, false, true),
                "",
                "",
                false);
    }

    /** Fill fields added after a preference was saved, preserving all explicitly stored values. */
    private static JsonNode withDefaults(JsonNode stored, JsonNode defaults) {
        if (stored instanceof ObjectNode object && defaults instanceof ObjectNode defaultObject) {
            for (var field : defaultObject.properties()) {
                JsonNode existing = object.get(field.getKey());
                if (existing == null) {
                    object.set(field.getKey(), field.getValue());
                } else {
                    withDefaults(existing, field.getValue());
                }
            }
        }
        return stored;
    }

    private static String value(String supplied, String fallback) {
        return supplied == null ? fallback : supplied;
    }
}
