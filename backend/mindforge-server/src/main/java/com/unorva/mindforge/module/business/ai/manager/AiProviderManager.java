package com.unorva.mindforge.module.business.ai.manager;

import com.unorva.mindforge.module.business.ai.client.CompatibleAiClient;
import com.unorva.mindforge.module.business.ai.domain.bo.ProviderCredentialBO;
import com.unorva.mindforge.module.business.ai.domain.vo.AiSettingsVO;

import lombok.RequiredArgsConstructor;

import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;

/** Provider transport capability; caller controls when persistence begins. */
@Component
@RequiredArgsConstructor
public class AiProviderManager {
    private final CompatibleAiClient client;

    public String complete(
            ProviderCredentialBO credential, AiSettingsVO settings, List<Map<String, String>> context, boolean test) {
        return client.complete(credential, settings, context, test);
    }
}
