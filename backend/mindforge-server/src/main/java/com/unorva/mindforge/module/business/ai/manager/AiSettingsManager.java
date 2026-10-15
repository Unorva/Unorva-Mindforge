package com.unorva.mindforge.module.business.ai.manager;

import com.unorva.mindforge.common.datasource.manager.BusinessLockManager;
import com.unorva.mindforge.module.business.ai.dao.AiPreferenceDao;

import lombok.RequiredArgsConstructor;

import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/** Keeps preferences and encrypted credentials in one database transaction. */
@Component
@RequiredArgsConstructor
public class AiSettingsManager {
    private final AiPreferenceDao preferences;
    private final AiCredentialManager credentials;
    private final BusinessLockManager locks;

    public String findJson(long userId) {
        return preferences.findJson(userId);
    }

    @Transactional(rollbackFor = Exception.class)
    public void save(long userId, String json, String baseUrl, String apiKey) {
        locks.lock(userId, "ai");
        credentials.save(userId, baseUrl, apiKey);
        preferences.save(userId, json);
    }

    @Transactional(rollbackFor = Exception.class)
    public void removeCredential(long userId) {
        locks.lock(userId, "ai");
        credentials.remove(userId);
    }
}
