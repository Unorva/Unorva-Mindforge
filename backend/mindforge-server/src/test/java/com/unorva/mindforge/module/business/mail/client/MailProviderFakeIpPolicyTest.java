package com.unorva.mindforge.module.business.mail.client;

import static org.junit.jupiter.api.Assertions.*;

import com.unorva.mindforge.module.business.mail.service.MailAccountService;

import org.junit.jupiter.api.Test;

import java.net.InetAddress;
import java.util.Locale;

/**
 * Proxy compatibility must not turn built-in provider presets into arbitrary internal destinations.
 */
class MailProviderFakeIpPolicyTest {
    private final MailAccountService accounts = new MailAccountService(null, null);

    @Test
    void fakeIpRemainsBlockedUnlessTheIndependentOptInIsEnabled() throws Exception {
        InetAddress fake = InetAddress.getByName("198.18.0.55");
        for (var provider : accounts.providers()) {
            if ("custom".equals(provider.id())) continue;
            assertFalse(allowed(false, "imap", provider.imapHost(), provider.imapPort(), fake));
            assertFalse(allowed(false, "smtp", provider.smtpHost(), provider.smtpPort(), fake));
        }
    }

    @Test
    void everyBuiltInPresetAcceptsOnlyItsExactProtocolHostAndPort() throws Exception {
        InetAddress fake = InetAddress.getByName("198.18.0.55");
        for (var provider : accounts.providers()) {
            if ("custom".equals(provider.id())) continue;
            assertTrue(allowed(true, "imap", provider.imapHost(), provider.imapPort(), fake));
            assertTrue(allowed(true, "smtp", provider.smtpHost(), provider.smtpPort(), fake));
            // DNS names are case-insensitive, while protocol and port remain exact.
            assertTrue(
                    allowed(
                            true,
                            "imap",
                            provider.imapHost().toUpperCase(Locale.ROOT),
                            provider.imapPort(),
                            fake));
            assertTrue(
                    allowed(
                            true,
                            "smtp",
                            provider.smtpHost().toUpperCase(Locale.ROOT),
                            provider.smtpPort(),
                            fake));
            assertFalse(allowed(true, "imap", provider.imapHost(), provider.imapPort() + 1, fake));
            assertFalse(allowed(true, "smtp", provider.smtpHost(), provider.smtpPort() + 1, fake));
            assertFalse(allowed(true, "smtp", provider.imapHost(), provider.imapPort(), fake));
            assertFalse(allowed(true, "imap", provider.smtpHost(), provider.smtpPort(), fake));
        }
    }

    @Test
    void exceptionCoversExactlyTheBenchmarkFakeIpRangeAndNoOtherPrivateAddresses()
            throws Exception {
        for (String boundary :
                new String[] {"198.18.0.0", "198.18.255.255", "198.19.0.0", "198.19.255.255"}) {
            assertTrue(allowed(true, "imap", "imap.qq.com", 993, InetAddress.getByName(boundary)));
        }
        for (String excluded : new String[] {"198.17.255.255", "198.20.0.0", "8.8.8.8"}) {
            assertFalse(allowed(true, "imap", "imap.qq.com", 993, InetAddress.getByName(excluded)));
        }
        for (String privateHost :
                new String[] {
                    "10.0.0.1",
                    "172.16.0.1",
                    "192.168.1.1",
                    "127.0.0.1",
                    "169.254.1.1",
                    "100.64.0.1",
                    "::1",
                    "fc00::1",
                    "fe80::1"
                }) {
            InetAddress address = InetAddress.getByName(privateHost);
            assertTrue(MailGateway.isPrivateAddress(address));
            assertFalse(allowed(true, "imap", "imap.qq.com", 993, address));
        }
    }

    @Test
    void suffixesCustomDomainsWhitespaceAndWrongPortsCannotUseTheException() throws Exception {
        InetAddress fake = InetAddress.getByName("198.18.0.55");
        for (String untrustedHost :
                new String[] {
                    "imap.qq.com.evil.invalid",
                    "evil-imap.qq.com",
                    "imap.qq.com.",
                    " imap.qq.com",
                    "imap.qq.com ",
                    "imap.example.com",
                    "198.18.0.55",
                    "https://imap.qq.com",
                    "imap.qq.com:993"
                }) {
            assertFalse(allowed(true, "imap", untrustedHost, 993, fake));
        }
        assertFalse(allowed(true, "imap", "imap.qq.com", 465, fake));
        assertFalse(allowed(true, "smtp", "smtp.qq.com", 587, fake));
        assertFalse(allowed(true, "SMTP", "smtp.qq.com", 465, fake));
        assertFalse(allowed(true, "pop3", "imap.qq.com", 993, fake));
        assertFalse(allowed(true, "imap", null, 993, fake));
    }

    @Test
    void proxyOptInPreservesCertificateHostnameChecksAndRequiredTls() {
        MailGateway gateway = new MailGateway(false, true);
        var ssl = gateway.properties("imap", "imap.qq.com", "ssl", "password");
        assertEquals("true", ssl.getProperty("mail.imap.ssl.enable"));
        assertEquals("true", ssl.getProperty("mail.imap.ssl.checkserveridentity"));
        assertEquals("TLSv1.3 TLSv1.2", ssl.getProperty("mail.imap.ssl.protocols"));
        assertEquals("false", ssl.getProperty("mail.imap.socketFactory.fallback"));
        assertNull(ssl.getProperty("mail.imap.ssl.trust"));
        var starttls = gateway.properties("smtp", "smtp-mail.outlook.com", "starttls", "oauth2");
        assertEquals("true", starttls.getProperty("mail.smtp.starttls.required"));
        assertEquals("true", starttls.getProperty("mail.smtp.ssl.checkserveridentity"));
        assertNull(starttls.getProperty("mail.smtp.ssl.trust"));
    }

    @Test
    void mixedDnsAnswersCannotHideAnInternalAddressBehindAnAllowedFakeIp() throws Exception {
        InetAddress fake = InetAddress.getByName("198.18.0.55");
        InetAddress internal = InetAddress.getByName("192.168.1.1");
        assertDoesNotThrow(
                () ->
                        MailGateway.verifyResolvedAddresses(
                                "imap", "imap.qq.com", 993, false, true, new InetAddress[] {fake}));
        assertThrows(
                MailGateway.FakeProxyMailHostException.class,
                () ->
                        MailGateway.verifyResolvedAddresses(
                                "imap",
                                "imap.qq.com",
                                993,
                                false,
                                false,
                                new InetAddress[] {fake}));
        for (InetAddress[] mixed : new InetAddress[][] {{fake, internal}, {internal, fake}}) {
            assertThrows(
                    MailGateway.BlockedMailHostException.class,
                    () ->
                            MailGateway.verifyResolvedAddresses(
                                    "imap", "imap.qq.com", 993, false, true, mixed));
        }
    }

    private static boolean allowed(
            boolean enabled, String protocol, String host, int port, InetAddress address) {
        return MailGateway.providerFakeIpAllowed(enabled, protocol, host, port, address);
    }
}
