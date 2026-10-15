package com.unorva.mindforge.module.business.mail.client;

import static org.junit.jupiter.api.Assertions.*;

import jakarta.mail.Address;
import jakarta.mail.AuthenticationFailedException;
import jakarta.mail.MessagingException;
import jakarta.mail.SendFailedException;
import jakarta.mail.internet.InternetAddress;

import org.eclipse.angus.mail.smtp.SMTPAddressFailedException;
import org.eclipse.angus.mail.smtp.SMTPSendFailedException;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.net.ConnectException;
import java.net.InetAddress;
import java.net.SocketTimeoutException;
import java.net.UnknownHostException;

import javax.net.ssl.SSLHandshakeException;

/** SMTP reply classification must not permit a retry after an uncertain delivery. */
class MailGatewayTest {
    @Test
    void failedAddressArraysDoNotProveThatTheServerRejectedData() throws Exception {
        Address recipient = new InternetAddress("recipient@example.com");
        SendFailedException unknown =
                new SendFailedException(
                        "Connection lost",
                        new IOException("Timeout"),
                        null,
                        new Address[] {recipient},
                        null);
        assertFalse(MailGateway.definitelyRejected(unknown));
        SMTPSendFailedException interrupted =
                new SMTPSendFailedException(
                        ".", -1, "Connection lost", null, null, new Address[] {recipient}, null);
        assertFalse(MailGateway.definitelyRejected(interrupted));
    }

    @Test
    void explicitSmtpRejectionsCanReturnTheClaimToDraft() throws Exception {
        InternetAddress recipient = new InternetAddress("recipient@example.com");
        SMTPSendFailedException rejected =
                new SMTPSendFailedException(
                        ".", 550, "Rejected", null, null, new Address[] {recipient}, null);
        assertTrue(MailGateway.definitelyRejected(rejected));
        SMTPAddressFailedException invalidAddress =
                new SMTPAddressFailedException(recipient, "RCPT TO", 550, "Rejected");
        assertTrue(
                MailGateway.definitelyRejected(
                        new SendFailedException(
                                "Invalid address",
                                invalidAddress,
                                null,
                                null,
                                new Address[] {recipient})));
        // A provider report with any delivered recipient must remain locked even if another was
        // rejected.
        SMTPSendFailedException partiallyDelivered =
                new SMTPSendFailedException(
                        ".", 550, "Rejected", null, new Address[] {recipient}, null, null);
        assertFalse(MailGateway.definitelyRejected(partiallyDelivered));
    }

    @Test
    void connectionDiagnosticsRetainTheFailingStageAndUseOnlySafeTypeBasedMessages() {
        Exception[] failures = {
            new UnknownHostException("synthetic-raw-provider-secret"),
            new SocketTimeoutException("synthetic-raw-provider-secret"),
            new SSLHandshakeException("synthetic-raw-provider-secret"),
            new ConnectException("synthetic-raw-provider-secret"),
            new MailGateway.BlockedMailHostException()
        };
        String[] instructions = {"DNS", "超时", "TLS", "端口", "内网"};
        for (int index = 0; index < failures.length; index++) {
            MessagingException wrapped =
                    new MessagingException("synthetic-raw-provider-secret", failures[index]);
            var error = MailGateway.connectionFailure("发件 SMTP", "password", wrapped);
            assertTrue(error.getMessage().startsWith("发件 SMTP"));
            assertTrue(error.getMessage().contains(instructions[index]));
            assertFalse(error.getMessage().contains("synthetic-raw-provider-secret"));
        }
    }

    @Test
    void authenticationHintsDistinguishAuthorizationCodesAndExpiredOauthTokens() {
        var rejected = new AuthenticationFailedException("synthetic-raw-provider-secret");
        String password =
                MailGateway.connectionFailure("收件 IMAP", "password", rejected).getMessage();
        assertTrue(password.contains("授权码"));
        assertTrue(password.contains("不能直接使用登录密码"));
        String oauth = MailGateway.connectionFailure("发件 SMTP", "oauth2", rejected).getMessage();
        assertTrue(oauth.contains("访问令牌"));
        assertTrue(oauth.contains("过期"));
        assertFalse(password.contains("synthetic-raw-provider-secret"));
        assertFalse(oauth.contains("synthetic-raw-provider-secret"));
    }

    @Test
    void unclassifiedConnectionErrorsNeverExposeProviderResponses() {
        var unknown = new IOException("synthetic-raw-provider-secret");
        String message = MailGateway.connectionFailure("收件 IMAP", "password", unknown).getMessage();
        assertTrue(message.startsWith("收件 IMAP"));
        assertFalse(message.contains("synthetic-raw-provider-secret"));
    }

    @Test
    void proxyFakeIpExplainsTheDnsProblemWithoutWeakeningPrivateHostBlocking() throws Exception {
        InetAddress proxy = InetAddress.getByName("198.18.0.55");
        assertTrue(MailGateway.isPrivateAddress(proxy));
        assertTrue(MailGateway.isFakeProxyAddress(proxy));
        assertTrue(MailGateway.isFakeProxyAddress(InetAddress.getByName("198.19.255.255")));
        assertFalse(MailGateway.isFakeProxyAddress(InetAddress.getByName("192.168.1.2")));
        String message =
                MailGateway.connectionFailure(
                                "收件 IMAP",
                                "password",
                                new MessagingException(
                                        "synthetic-raw-provider-secret",
                                        new MailGateway.FakeProxyMailHostException()))
                        .getMessage();
        assertTrue(message.contains("Fake-IP"));
        assertTrue(message.contains("真实 IP"));
        assertFalse(message.contains("synthetic-raw-provider-secret"));
    }
}
