package com.unorva.mindforge.module.business.mail.manager;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.unorva.mindforge.common.datasource.manager.BusinessLockManager;
import com.unorva.mindforge.common.exception.BusinessErrorCode;
import com.unorva.mindforge.common.exception.BusinessException;
import com.unorva.mindforge.module.business.mail.client.MailGateway;
import com.unorva.mindforge.module.business.mail.dao.*;
import com.unorva.mindforge.module.business.mail.domain.bo.MailConnectionBO;
import com.unorva.mindforge.module.business.mail.domain.entity.MailAccountEntity;
import com.unorva.mindforge.module.business.mail.domain.form.MailAccountSaveForm;
import com.unorva.mindforge.module.business.mail.service.MailAccountService;
import com.unorva.mindforge.module.business.mail.support.MailCredentialCipher;

import org.junit.jupiter.api.Test;

class MailAccountManagerTest {
    private final MailAccountDao accounts = mock(MailAccountDao.class);
    private final MailDao mails = mock(MailDao.class);
    private final MailRemoteDao remote = mock(MailRemoteDao.class);
    private final BusinessLockManager locks = mock(BusinessLockManager.class);
    private final MailCredentialCipher cipher = mock(MailCredentialCipher.class);
    private final MailAccountManager manager =
            new MailAccountManager(accounts, mails, remote, locks, cipher);

    @Test
    void deletionCannotRemoveTheAccountOrCacheOfAnUncertainDelivery() {
        when(accounts.selectOwned(7L, 3L)).thenReturn(account("original@example.com"));
        when(mails.countSending(7L, 3L)).thenReturn(1L);
        assertEquals(
                BusinessErrorCode.CONFLICT,
                assertThrows(BusinessException.class, () -> manager.delete(7L, 3L)).getErrorCode());
        verify(locks).lock(7L, "mail");
        verify(accounts, never()).deleteOwned(anyLong(), anyLong());
        verify(mails, never()).deleteForAccount(anyLong(), anyLong());
        verifyNoInteractions(remote);
    }

    @Test
    void oldConnectionTestResultCannotMarkAChangedAccountConnected() {
        MailConnectionBO tested =
                new MailConnectionBO(
                        3L,
                        "original@example.com",
                        "",
                        "original@example.com",
                        "imap.example.com",
                        993,
                        "ssl",
                        "smtp.example.com",
                        465,
                        "ssl",
                        "password",
                        "password");
        when(accounts.selectOwned(7L, 3L)).thenReturn(account("changed@example.com"));
        when(cipher.decrypt(7L, "changed@example.com", "ciphertext")).thenReturn("password");
        assertEquals(
                BusinessErrorCode.CONFLICT,
                assertThrows(
                                BusinessException.class,
                                () -> manager.recordTestResult(7L, tested, true, "Connected"))
                        .getErrorCode());
        verify(accounts, never()).connectionSuccess(anyLong(), anyLong());
        verify(accounts, never()).connectionFailure(anyLong(), anyLong(), anyString());
    }

    @Test
    void accountLookupAlwaysRequiresTheExplicitOwner() {
        assertEquals(
                BusinessErrorCode.NOT_FOUND,
                assertThrows(BusinessException.class, () -> manager.requireConnection(8L, 3L))
                        .getErrorCode());
        verify(accounts).selectOwned(8L, 3L);
        verifyNoInteractions(cipher, mails, remote);
    }

    @Test
    void oauthTokensCanExceedPasswordLengthWithoutBeingTruncated() {
        String token = "x".repeat(12000);
        when(cipher.encrypt(7L, "sender@example.com", token)).thenReturn("encrypted-oauth-token");
        when(accounts.insertOwned(any()))
                .thenAnswer(
                        call -> {
                            MailAccountEntity entity = call.getArgument(0);
                            entity.setId(3L);
                            return 1;
                        });
        when(accounts.selectOwned(7L, 3L)).thenReturn(account("sender@example.com"));
        manager.save(
                7L,
                newAccount(token, "oauth2"),
                new MailAccountService(manager, mock(MailGateway.class)).providers());
        var stored = org.mockito.ArgumentCaptor.forClass(MailAccountEntity.class);
        verify(accounts).insertOwned(stored.capture());
        assertEquals("oauth2", stored.getValue().getAuthType());
        assertEquals("encrypted-oauth-token", stored.getValue().getPasswordCiphertext());
        verify(cipher).encrypt(7L, "sender@example.com", token);
    }

    @Test
    void credentialsRejectControlCharactersAndRespectAuthenticationSpecificLimits() {
        var providers = new MailAccountService(manager, mock(MailGateway.class)).providers();
        for (MailAccountSaveForm invalid :
                java.util.List.of(
                        newAccount("x".repeat(2049), "password"),
                        newAccount("x".repeat(16001), "oauth2"),
                        newAccount("access-token\n", "oauth2"))) {
            assertEquals(
                    BusinessErrorCode.INVALID_INPUT,
                    assertThrows(
                                    BusinessException.class,
                                    () -> manager.save(7L, invalid, providers))
                            .getErrorCode());
        }
        verify(accounts, never()).insertOwned(any());
        verify(cipher, never()).encrypt(anyLong(), anyString(), anyString());
    }

    private static MailAccountSaveForm newAccount(String credential, String authType) {
        return new MailAccountSaveForm(
                null,
                "outlook",
                "sender@example.com",
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                true,
                false,
                credential,
                authType);
    }

    private static MailAccountEntity account(String email) {
        MailAccountEntity entity = new MailAccountEntity();
        entity.setId(3L);
        entity.setUserId(7L);
        entity.setEmail(email);
        entity.setProvider("custom");
        entity.setDisplayName("");
        entity.setUsername(email);
        entity.setImapHost("imap.example.com");
        entity.setImapPort(993);
        entity.setImapSecurity("ssl");
        entity.setSmtpHost("smtp.example.com");
        entity.setSmtpPort(465);
        entity.setSmtpSecurity("ssl");
        entity.setEnabled(true);
        entity.setDefaultAccount(true);
        entity.setPasswordCiphertext("ciphertext");
        entity.setAuthType("password");
        return entity;
    }
}
