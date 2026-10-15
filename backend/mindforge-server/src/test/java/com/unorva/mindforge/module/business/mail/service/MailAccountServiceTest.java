package com.unorva.mindforge.module.business.mail.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.unorva.mindforge.common.exception.BusinessErrorCode;
import com.unorva.mindforge.common.exception.BusinessException;
import com.unorva.mindforge.module.business.mail.client.MailGateway;
import com.unorva.mindforge.module.business.mail.domain.bo.MailConnectionBO;
import com.unorva.mindforge.module.business.mail.manager.MailAccountManager;

import org.junit.jupiter.api.Test;

class MailAccountServiceTest {
    private final MailAccountManager manager = mock(MailAccountManager.class);
    private final MailGateway gateway = mock(MailGateway.class);
    private final MailAccountService service = new MailAccountService(manager, gateway);
    private final MailConnectionBO connection =
            new MailConnectionBO(
                    3L,
                    "sender@example.com",
                    "",
                    "sender@example.com",
                    "imap.example.com",
                    993,
                    "ssl",
                    "smtp.example.com",
                    465,
                    "ssl",
                    "synthetic-credential",
                    "password");

    @Test
    void connectionTestRetainsSafeImapOrSmtpDiagnosticsInTheResponseAndAccountStatus() {
        when(manager.requireConnection(7L, 3L)).thenReturn(connection);
        String safeMessage = "发件 SMTP 认证失败，请确认客户端授权码";
        doThrow(new BusinessException(safeMessage, BusinessErrorCode.PROVIDER_FAILED))
                .when(gateway)
                .testConnection(connection);
        var result = service.test(7L, 3L);
        assertFalse(result.success());
        assertEquals(safeMessage, result.message());
        verify(manager).recordTestResult(7L, connection, false, safeMessage);
    }

    @Test
    void successfulConnectionTestStillReportsBothProtocolsWithoutSendingMail() {
        when(manager.requireConnection(7L, 3L)).thenReturn(connection);
        var result = service.test(7L, 3L);
        assertTrue(result.success());
        assertEquals("IMAP 与 SMTP 连接验证成功", result.message());
        verify(manager).recordTestResult(7L, connection, true, result.message());
        verify(gateway).testConnection(connection);
        verifyNoMoreInteractions(gateway);
    }
}
