package com.unorva.mindforge.module.business.mail.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.unorva.mindforge.common.datasource.manager.BusinessLockManager;
import com.unorva.mindforge.common.exception.BusinessErrorCode;
import com.unorva.mindforge.common.exception.BusinessException;
import com.unorva.mindforge.module.business.mail.client.MailGateway;
import com.unorva.mindforge.module.business.mail.dao.*;
import com.unorva.mindforge.module.business.mail.domain.bo.*;
import com.unorva.mindforge.module.business.mail.domain.entity.*;
import com.unorva.mindforge.module.business.mail.domain.form.*;
import com.unorva.mindforge.module.business.mail.manager.MailManager;
import com.unorva.mindforge.module.business.mail.support.MailCredentialCipher;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.SimpleTransactionStatus;

import java.time.LocalDateTime;
import java.util.List;

/** Real manager, mocked MyBatis Daos and transport: owner isolation and delivery state without network I/O. */
class MailServiceTest {
    private static final long USER = 7L;
    private static final long ACCOUNT = 3L;
    private static final long MAIL = 11L;
    private final MailDao mailDao = mock(MailDao.class);
    private final MailAccountDao accountDao = mock(MailAccountDao.class);
    private final MailRemoteDao remoteDao = mock(MailRemoteDao.class);
    private final MailCredentialCipher cipher = mock(MailCredentialCipher.class);
    private final MailGateway gateway = mock(MailGateway.class);
    private final BusinessLockManager locks = mock(BusinessLockManager.class);
    private final PlatformTransactionManager transactions = mock(PlatformTransactionManager.class);
    private final MailManager manager = new MailManager(mailDao, accountDao, remoteDao, cipher, locks, transactions);
    private final MailService service = new MailService(manager, gateway);
    private final MailConnectionBO connection =
            new MailConnectionBO(
                    ACCOUNT,
                    "sender@example.com",
                    "Sender",
                    "sender@example.com",
                    "imap.example.com",
                    993,
                    "ssl",
                    "smtp.example.com",
                    465,
                    "ssl",
                    "credential",
                    "password");
    private final MailSendForm form = new MailSendForm(MAIL, ACCOUNT, "recipient@example.com", "Subject", "Body");

    @BeforeEach
    void setup() {
        when(transactions.getTransaction(any())).thenAnswer(call -> new SimpleTransactionStatus());
        when(accountDao.selectOwned(USER, ACCOUNT)).thenReturn(account("sender@example.com"));
        when(cipher.decrypt(USER, "sender@example.com", "ciphertext")).thenReturn("credential");
        when(cipher.decrypt(USER, "changed@example.com", "ciphertext")).thenReturn("credential");
        when(mailDao.selectOwned(USER, MAIL)).thenReturn(mail("draft", LocalDateTime.now()));
        when(mailDao.updateOwned(any())).thenReturn(1);
        when(mailDao.claim(eq(USER), eq(MAIL), anyString())).thenReturn(1);
        when(mailDao.finishSend(eq(USER), eq(MAIL), anyString(), anyString())).thenReturn(1);
        when(mailDao.recover(USER, MAIL)).thenReturn(1);
        when(remoteDao.insertIdentity(any())).thenReturn(1);
        when(remoteDao.selectObsoleteMailIds(anyLong(), anyLong(), anyLong())).thenReturn(List.of());
        when(mailDao.insertOwned(any()))
                .thenAnswer(
                        call -> {
                            MailEntity entity = call.getArgument(0);
                            entity.setId(MAIL);
                            return 1;
                        });
    }

    @Test
    void commitsClaimBeforeTransportAndMarksSentOnlyAfterDelivery() {
        when(mailDao.selectOwned(USER, MAIL))
                .thenReturn(mail("draft", LocalDateTime.now()), mail("sent", LocalDateTime.now()));
        assertEquals("sent", service.send(USER, form).folder());
        var order = inOrder(mailDao, transactions, gateway);
        order.verify(mailDao).claim(eq(USER), eq(MAIL), anyString());
        order.verify(transactions).commit(any());
        order.verify(gateway).send(connection, form.recipient(), form.subject(), form.body());
        order.verify(mailDao).finishSend(eq(USER), eq(MAIL), anyString(), eq("sent"));
        order.verify(transactions).commit(any());
        verify(accountDao).connectionSuccess(USER, ACCOUNT);
        var definitions =
                org.mockito.ArgumentCaptor.forClass(org.springframework.transaction.TransactionDefinition.class);
        verify(transactions, times(2)).getTransaction(definitions.capture());
        assertTrue(
                definitions.getAllValues().stream()
                        .allMatch(
                                definition ->
                                        definition.getPropagationBehavior()
                                                == org.springframework.transaction.TransactionDefinition
                                                        .PROPAGATION_REQUIRES_NEW));
    }

    @Test
    void sendingWithoutADraftCreatesAnOwnedDraftBeforeClaiming() {
        when(mailDao.selectOwned(USER, MAIL)).thenReturn(mail("sent", LocalDateTime.now()));
        assertEquals(
                "sent",
                service.send(USER, new MailSendForm(null, ACCOUNT, form.recipient(), form.subject(), form.body()))
                        .folder());
        var saved = org.mockito.ArgumentCaptor.forClass(MailEntity.class);
        verify(mailDao).insertOwned(saved.capture());
        assertEquals(USER, saved.getValue().getUserId());
        assertEquals(ACCOUNT, saved.getValue().getAccountId());
        assertEquals(connection.email(), saved.getValue().getSender());
        assertEquals("draft", saved.getValue().getFolder());
        verify(mailDao).claim(eq(USER), eq(MAIL), anyString());
    }

    @Test
    void definiteDeliveryFailureReturnsClaimToDraft() {
        doThrow(new MailGateway.DeliveryException(true))
                .when(gateway)
                .send(any(), anyString(), anyString(), anyString());
        assertThrows(MailGateway.DeliveryException.class, () -> service.send(USER, form));
        verify(mailDao).finishSend(eq(USER), eq(MAIL), anyString(), eq("draft"));
        verify(mailDao, never()).finishSend(eq(USER), eq(MAIL), anyString(), eq("sent"));
        verify(transactions, times(3)).commit(any());
    }

    @Test
    void ambiguousDeliveryFailureRetainsSendingClaim() {
        doThrow(new MailGateway.DeliveryException(false))
                .when(gateway)
                .send(any(), anyString(), anyString(), anyString());
        assertThrows(MailGateway.DeliveryException.class, () -> service.send(USER, form));
        verify(mailDao, never()).finishSend(anyLong(), anyLong(), anyString(), anyString());
        verify(transactions, times(2)).commit(any());
    }

    @Test
    void unexpectedTransportFailureRetainsClaimAndHidesProviderDetails() {
        doThrow(new IllegalStateException("secret provider response"))
                .when(gateway)
                .send(any(), anyString(), anyString(), anyString());
        BusinessException error = assertThrows(BusinessException.class, () -> service.send(USER, form));
        assertEquals(BusinessErrorCode.PROVIDER_FAILED, error.getErrorCode());
        assertFalse(error.getMessage().contains("secret"));
        verify(mailDao, never()).finishSend(anyLong(), anyLong(), anyString(), anyString());
    }

    @Test
    void cannotSubmitAnAlreadySendingOrSentMessageAgain() {
        for (String folder : List.of("sending", "sent")) {
            when(mailDao.selectOwned(USER, MAIL)).thenReturn(mail(folder, LocalDateTime.now()));
            assertEquals(
                    BusinessErrorCode.CONFLICT,
                    assertThrows(BusinessException.class, () -> service.send(USER, form)).getErrorCode());
        }
        verifyNoInteractions(gateway);
        verify(mailDao, never()).claim(anyLong(), anyLong(), anyString());
        verify(transactions, times(2)).rollback(any());
    }

    @Test
    void staleCompletionCannotOverwriteARecoveredOrReplacedClaim() {
        when(mailDao.finishSend(eq(USER), eq(MAIL), anyString(), eq("sent"))).thenReturn(0);
        assertEquals(
                BusinessErrorCode.CONFLICT,
                assertThrows(BusinessException.class, () -> service.send(USER, form)).getErrorCode());
        verify(accountDao, never()).connectionSuccess(anyLong(), anyLong());
        verify(transactions).rollback(any());
    }

    @Test
    void validatesSingleRecipientBeforeClaimingOrSending() {
        for (String recipient :
                List.of("a@example.com,b@example.com", "a@example.com\r\nBcc: b@example.com", "invalid")) {
            var invalid = new MailSendForm(MAIL, ACCOUNT, recipient, "Subject", "Body");
            assertEquals(
                    BusinessErrorCode.INVALID_INPUT,
                    assertThrows(BusinessException.class, () -> service.send(USER, invalid)).getErrorCode());
        }
        verifyNoInteractions(mailDao, accountDao, gateway, transactions);
    }

    @Test
    void rejectsAnotherUsersAccountBeforeListingOrSending() {
        assertThrows(BusinessException.class, () -> service.list(USER, 99L));
        assertThrows(
                BusinessException.class,
                () -> service.send(USER, new MailSendForm(MAIL, 99L, "a@example.com", "", "")));
        verifyNoInteractions(mailDao, remoteDao, gateway);
        verify(accountDao, times(2)).selectOwned(USER, 99L);
    }

    @Test
    void syncDeduplicatesMessagesAndKeepsDeletionTombstones() {
        var first = remote(1);
        var existing = remote(2);
        var deleted = remote(3);
        when(gateway.fetchInbox(eq(connection), anyMap())).thenReturn(List.of(first, first, existing, deleted));
        when(remoteDao.selectIdentity(USER, ACCOUNT, 5L, 2L)).thenReturn(identity(22L, 2L));
        when(remoteDao.selectIdentity(USER, ACCOUNT, 5L, 3L)).thenReturn(identity(null, 3L));
        assertEquals(2, service.sync(USER, ACCOUNT).syncedCount());
        verify(mailDao).insertOwned(any(MailEntity.class));
        var linked = org.mockito.ArgumentCaptor.forClass(MailRemoteEntity.class);
        verify(remoteDao).insertIdentity(linked.capture());
        assertEquals(USER, linked.getValue().getUserId());
        assertEquals(ACCOUNT, linked.getValue().getAccountId());
        assertEquals(MAIL, linked.getValue().getMailId());
        assertEquals(1L, linked.getValue().getRemoteUid());
        var refreshed = org.mockito.ArgumentCaptor.forClass(MailEntity.class);
        verify(mailDao).refreshRemote(refreshed.capture());
        assertEquals(22L, refreshed.getValue().getId());
        verify(accountDao).syncSuccess(USER, ACCOUNT);
    }

    @Test
    void rejectsFetchedMailIfAccountChangedDuringNetworkCall() {
        when(accountDao.selectOwned(USER, ACCOUNT))
                .thenReturn(account("sender@example.com"), account("changed@example.com"));
        when(gateway.fetchInbox(eq(connection), anyMap())).thenReturn(List.of(remote(1)));
        assertEquals(
                BusinessErrorCode.CONFLICT,
                assertThrows(BusinessException.class, () -> service.sync(USER, ACCOUNT)).getErrorCode());
        verify(mailDao).selectFlagVersions(USER, ACCOUNT);
        verifyNoInteractions(remoteDao);
        verify(mailDao, never()).insertOwned(any());
        verify(accountDao, never()).syncSuccess(anyLong(), anyLong());
    }

    @Test
    void oldSyncCannotUndoNewerReadOrStarFlagsEvenWhenTheyChangedTwice() {
        MailFlagsVersionBO beforeFetch = new MailFlagsVersionBO();
        beforeFetch.setId(MAIL);
        beforeFetch.setFlagsVersion(4L);
        when(mailDao.selectFlagVersions(USER, ACCOUNT)).thenReturn(List.of(beforeFetch));
        when(remoteDao.selectIdentity(USER, ACCOUNT, 5L, 1L)).thenReturn(identity(MAIL, 1L));
        MailEntity latest = mail("inbox", LocalDateTime.now());
        latest.setStarred(true);
        latest.setUnread(false);
        latest.setFlagsVersion(6L);
        when(mailDao.selectOwned(USER, MAIL)).thenReturn(latest);
        when(mailDao.selectSyncState(USER, MAIL)).thenReturn(latest);
        when(gateway.fetchInbox(eq(connection), anyMap())).thenReturn(List.of(remote(1)));
        service.sync(USER, ACCOUNT);
        verify(mailDao, never()).refreshRemote(any());
        assertTrue(latest.getStarred());
        assertFalse(latest.getUnread());
    }

    @Test
    void syncRefreshesExternalFlagsWhenTheLocalRevisionDidNotChange() {
        MailFlagsVersionBO beforeFetch = new MailFlagsVersionBO();
        beforeFetch.setId(MAIL);
        beforeFetch.setFlagsVersion(4L);
        when(mailDao.selectFlagVersions(USER, ACCOUNT)).thenReturn(List.of(beforeFetch));
        when(remoteDao.selectIdentity(USER, ACCOUNT, 5L, 1L)).thenReturn(identity(MAIL, 1L));
        MailEntity current = mail("inbox", LocalDateTime.now());
        current.setStarred(true);
        current.setUnread(false);
        current.setFlagsVersion(4L);
        when(mailDao.selectOwned(USER, MAIL)).thenReturn(current);
        when(gateway.fetchInbox(eq(connection), anyMap())).thenReturn(List.of(remote(1)));
        service.sync(USER, ACCOUNT);
        var refreshed = org.mockito.ArgumentCaptor.forClass(MailEntity.class);
        verify(mailDao).refreshRemote(refreshed.capture());
        assertFalse(refreshed.getValue().getStarred());
        assertTrue(refreshed.getValue().getUnread());
    }

    @Test
    void recoveryBlocksActiveSendAndAllowsAnOldClaimToBecomeDraft() {
        when(mailDao.selectOwned(USER, MAIL)).thenReturn(mail("sending", LocalDateTime.now()));
        when(mailDao.recover(USER, MAIL)).thenReturn(0);
        assertThrows(BusinessException.class, () -> service.recoverSend(USER, MAIL));
        verify(mailDao).recover(USER, MAIL);
        when(mailDao.selectOwned(USER, MAIL))
                .thenReturn(mail("sending", LocalDateTime.now().minusMinutes(6)), mail("draft", LocalDateTime.now()));
        when(mailDao.recover(USER, MAIL)).thenReturn(1);
        assertEquals("draft", service.recoverSend(USER, MAIL).folder());
        verify(mailDao, times(2)).recover(USER, MAIL);
        verifyNoInteractions(gateway);
    }

    @Test
    void recoveryUsesDatabaseAgeWhenJdbcAndApplicationTimestampsDifferByEightHours() {
        // An eight-hour offset in a zone-less JDBC value is not evidence of an old delivery claim.
        when(mailDao.selectOwned(USER, MAIL)).thenReturn(mail("sending", LocalDateTime.now().minusHours(8)));
        when(mailDao.recover(USER, MAIL)).thenReturn(0);
        BusinessException blocked = assertThrows(BusinessException.class, () -> service.recoverSend(USER, MAIL));
        assertEquals(BusinessErrorCode.CONFLICT, blocked.getErrorCode());
        verify(mailDao).recover(USER, MAIL);
        verify(mailDao).selectOwned(USER, MAIL);
        verifyNoInteractions(gateway);
    }

    @Test
    void cannotMoveOrDeleteAClaimWhileDeliveryIsUncertain() {
        when(mailDao.selectOwned(USER, MAIL)).thenReturn(mail("sending", LocalDateTime.now()));
        assertThrows(BusinessException.class, () -> service.patch(USER, MAIL, new MailPatchForm("draft", true, false)));
        assertThrows(BusinessException.class, () -> service.delete(USER, MAIL));
        verify(mailDao, never()).patchOwned(anyLong(), anyLong(), any(), any(), any());
        verify(mailDao, never()).deleteOwned(anyLong(), anyLong());
    }

    @Test
    void ordinaryCrudCannotCreateOrPromoteMailToSent() {
        for (String folder : List.of("inbox", "sent", "archive", "trash")) {
            assertThrows(
                    BusinessException.class,
                    () ->
                            service.save(
                                    USER,
                                    new MailSaveForm(
                                            null, "", "recipient@example.com", "", "", folder, false, false, null)));
        }
        assertThrows(
                BusinessException.class,
                () -> service.save(USER, new MailSaveForm(MAIL, null, null, null, null, "sent", null, null, ACCOUNT)));
        assertThrows(BusinessException.class, () -> service.patch(USER, MAIL, new MailPatchForm("sent", null, null)));
        when(mailDao.selectOwned(USER, MAIL)).thenReturn(mail("sent", LocalDateTime.now()));
        assertThrows(BusinessException.class, () -> service.patch(USER, MAIL, new MailPatchForm("draft", null, null)));
        // Moving a sent item through another folder must not make it eligible for delivery again.
        for (String archivedFolder : List.of("archive", "trash", "inbox")) {
            when(mailDao.selectOwned(USER, MAIL)).thenReturn(mail(archivedFolder, LocalDateTime.now()));
            assertThrows(
                    BusinessException.class, () -> service.patch(USER, MAIL, new MailPatchForm("draft", null, null)));
            assertThrows(
                    BusinessException.class,
                    () ->
                            service.save(
                                    USER,
                                    new MailSaveForm(MAIL, null, null, null, null, "draft", null, null, ACCOUNT)));
        }
        verify(mailDao, never()).insertOwned(any());
        verify(mailDao, never()).updateOwned(any());
        verify(mailDao, never()).patchOwned(anyLong(), anyLong(), any(), any(), any());
        verifyNoInteractions(gateway);
    }

    @Test
    void remoteFlagsRunBetweenDatabaseReadsAndRejectAChangedIdentity() {
        when(remoteDao.selectForMail(USER, MAIL)).thenReturn(identity(MAIL, 1L), identity(MAIL, 2L));
        assertThrows(BusinessException.class, () -> service.patch(USER, MAIL, new MailPatchForm(null, true, false)));
        verify(gateway).updateFlags(connection, 5L, 1L, true, false);
        verify(mailDao, never()).patchOwned(anyLong(), anyLong(), any(), any(), any());
    }

    private static MailEntity mail(String folder, LocalDateTime updatedAt) {
        MailEntity entity = new MailEntity();
        entity.setId(MAIL);
        entity.setUserId(USER);
        entity.setAccountId(ACCOUNT);
        entity.setSender("sender@example.com");
        entity.setRecipient("recipient@example.com");
        entity.setSubject("Subject");
        entity.setBody("Body");
        entity.setFolder(folder);
        entity.setStarred(false);
        entity.setUnread(false);
        entity.setCreatedAt(LocalDateTime.now().minusDays(1));
        entity.setUpdatedAt(updatedAt);
        return entity;
    }

    private static MailAccountEntity account(String email) {
        MailAccountEntity entity = new MailAccountEntity();
        entity.setId(ACCOUNT);
        entity.setUserId(USER);
        entity.setEmail(email);
        entity.setDisplayName("Sender");
        entity.setUsername(email);
        entity.setImapHost("imap.example.com");
        entity.setImapPort(993);
        entity.setImapSecurity("ssl");
        entity.setSmtpHost("smtp.example.com");
        entity.setSmtpPort(465);
        entity.setSmtpSecurity("ssl");
        entity.setPasswordCiphertext("ciphertext");
        entity.setEnabled(true);
        entity.setAuthType("password");
        return entity;
    }

    private static RemoteMailBO remote(long uid) {
        return new RemoteMailBO(
                5L,
                uid,
                "sender@example.com",
                "recipient@example.com",
                "Subject",
                "Body",
                false,
                true,
                LocalDateTime.now());
    }

    private static MailRemoteEntity identity(Long mailId, long uid) {
        MailRemoteEntity entity = new MailRemoteEntity();
        entity.setUserId(USER);
        entity.setAccountId(ACCOUNT);
        entity.setMailId(mailId);
        entity.setRemoteFolder("INBOX");
        entity.setUidValidity(5L);
        entity.setRemoteUid(uid);
        return entity;
    }
}
