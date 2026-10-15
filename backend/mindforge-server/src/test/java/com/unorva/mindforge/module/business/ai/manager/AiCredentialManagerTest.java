package com.unorva.mindforge.module.business.ai.manager;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.unorva.mindforge.common.exception.BusinessException;
import com.unorva.mindforge.module.business.ai.dao.AiCredentialDao;
import com.unorva.mindforge.module.business.ai.domain.entity.AiCredentialEntity;

import org.junit.jupiter.api.Test;

import java.util.Base64;
import java.util.concurrent.atomic.AtomicReference;

class AiCredentialManagerTest {
    @Test
    void encryptsStoredKeysPreservesBlankInputAndBindsCiphertextToOwner() {
        AiCredentialDao dao = mock(AiCredentialDao.class);
        AtomicReference<String> ciphertext = new AtomicReference<>();
        when(dao.find(anyLong()))
                .thenAnswer(
                        invocation -> {
                            if (ciphertext.get() == null) return null;
                            AiCredentialEntity entity = new AiCredentialEntity();
                            entity.setBaseUrl("http://127.0.0.1:1234/v1");
                            entity.setApiKeyCiphertext(ciphertext.get());
                            return entity;
                        });
        when(dao.save(anyLong(), anyString(), nullable(String.class)))
                .thenAnswer(
                        invocation -> {
                            ciphertext.set(invocation.getArgument(2));
                            return 1;
                        });
        AiCredentialManager manager = new AiCredentialManager(dao, Base64.getEncoder().encodeToString(new byte[32]));
        manager.save(7L, "http://127.0.0.1:1234/v1", "private-provider-key");
        assertFalse(ciphertext.get().contains("private-provider-key"));
        assertEquals("private-provider-key", manager.requireCredential(7L).apiKey());
        String firstCiphertext = ciphertext.get();
        manager.save(7L, "http://127.0.0.1:1234/v1", "");
        assertEquals(firstCiphertext, ciphertext.get());
        assertEquals("private-provider-key", manager.requireCredential(7L).apiKey());
        assertThrows(BusinessException.class, () -> manager.requireCredential(8L));
        assertFalse(manager.requireCredential(7L).toString().contains("private-provider-key"));
    }

    @Test
    void validatesCompatibleDestinationsAndAllowsLocalModelEndpoints() {
        assertEquals("http://127.0.0.1:11434/v1", AiCredentialManager.normalizeBaseUrl("http://127.0.0.1:11434/v1/"));
        assertEquals("https://example.test/v1", AiCredentialManager.normalizeBaseUrl("https://example.test/v1"));
        assertThrows(BusinessException.class, () -> AiCredentialManager.normalizeBaseUrl("file:///private"));
        assertThrows(
                BusinessException.class,
                () -> AiCredentialManager.normalizeBaseUrl("https://user:password@example.test"));
        assertThrows(
                BusinessException.class,
                () -> AiCredentialManager.normalizeBaseUrl("https://example.test/v1?key=secret"));
        assertThrows(
                BusinessException.class,
                () -> AiCredentialManager.normalizeBaseUrl("https://example.test/v1#fragment"));
    }

    @Test
    void refusesToPersistNewKeyWithoutServerEncryptionConfiguration() {
        AiCredentialManager manager = new AiCredentialManager(mock(AiCredentialDao.class), "");
        assertThrows(BusinessException.class, () -> manager.save(1L, "https://example.test/v1", "private-key"));
    }
}
