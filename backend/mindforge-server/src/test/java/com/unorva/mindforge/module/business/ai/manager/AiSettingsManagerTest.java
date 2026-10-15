package com.unorva.mindforge.module.business.ai.manager;

import static org.mockito.Mockito.*;

import com.unorva.mindforge.common.datasource.manager.BusinessLockManager;
import com.unorva.mindforge.module.business.ai.dao.AiPreferenceDao;

import org.junit.jupiter.api.Test;
import org.mockito.InOrder;

class AiSettingsManagerTest {
    @Test
    void serializesCredentialsAndPreferencesWithOneAiLock() {
        AiPreferenceDao dao = mock(AiPreferenceDao.class);
        AiCredentialManager credentials = mock(AiCredentialManager.class);
        BusinessLockManager locks = mock(BusinessLockManager.class);
        new AiSettingsManager(dao, credentials, locks).save(7L, "{}", "https://example.test/v1", "private-key");
        InOrder order = inOrder(locks, credentials, dao);
        order.verify(locks).lock(7L, "ai");
        order.verify(credentials).save(7L, "https://example.test/v1", "private-key");
        order.verify(dao).save(7L, "{}");
    }
}
