package com.unorva.mindforge.module.business.mail.client;

import static org.junit.jupiter.api.Assertions.*;

import com.unorva.mindforge.common.exception.BusinessException;
import com.unorva.mindforge.module.business.mail.domain.bo.MailConnectionBO;

import jakarta.mail.Session;
import jakarta.mail.internet.MimeMessage;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.parallel.ResourceLock;

import java.io.*;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.security.KeyStore;
import java.util.*;
import java.util.concurrent.*;

import javax.net.ssl.KeyManagerFactory;
import javax.net.ssl.SSLContext;
import javax.net.ssl.SSLSocket;
import javax.net.ssl.TrustManagerFactory;

/**
 * Exercises the real Angus transport against local TLS servers, without provider credentials or
 * delivery.
 */
@ResourceLock("javax.net.ssl.defaultContext")
class MailGatewayProtocolTest {
    private static final String USER = "sender@example.com";
    private static final String CREDENTIAL = "synthetic-test-credential";
    private SSLContext originalContext;
    private SSLContext tls;

    @BeforeEach
    void trustOnlyTheLocalFixtureCertificate() throws Exception {
        originalContext = SSLContext.getDefault();
        KeyStore keys = KeyStore.getInstance("PKCS12");
        try (InputStream input = getClass().getResourceAsStream("/mail/local-fixture.p12")) {
            assertNotNull(input);
            keys.load(input, "fixture-password".toCharArray());
        }
        KeyManagerFactory keyManager =
                KeyManagerFactory.getInstance(KeyManagerFactory.getDefaultAlgorithm());
        keyManager.init(keys, "fixture-password".toCharArray());
        TrustManagerFactory trustManager =
                TrustManagerFactory.getInstance(TrustManagerFactory.getDefaultAlgorithm());
        trustManager.init(keys);
        tls = SSLContext.getInstance("TLS");
        tls.init(keyManager.getKeyManagers(), trustManager.getTrustManagers(), null);
        SSLContext.setDefault(tls);
    }

    @AfterEach
    void restoreDefaultTrust() {
        SSLContext.setDefault(originalContext);
    }

    @Test
    void passwordLoginOverImplicitTlsIdentifiesTheClientBeforeOpeningInbox() throws Exception {
        try (LocalMailServer imap = server(true, "ssl", true, true);
                LocalMailServer smtp = server(false, "ssl", false, true)) {
            new MailGateway(true).testConnection(connection(imap, smtp, "ssl", "password"));
            imap.completed();
            smtp.completed();
            assertTrue(imap.identified);
            assertTrue(imap.authenticated);
            assertTrue(smtp.authenticated);
            assertTrue(imap.commands.indexOf("ID") < imap.commands.indexOf("EXAMINE"));
            assertEquals("\0" + USER + "\0" + CREDENTIAL, imap.authPayload);
            assertEquals(USER + "\0" + USER + "\0" + CREDENTIAL, smtp.authPayload);
            assertEquals(0, smtp.dataCommands);
        }
    }

    @Test
    void oauth2AuthenticatesOnlyAfterStarttlsAndDoesNotFallBackToPassword() throws Exception {
        try (LocalMailServer imap = server(true, "starttls", false, true);
                LocalMailServer smtp = server(false, "starttls", false, true)) {
            new MailGateway(true).testConnection(connection(imap, smtp, "starttls", "oauth2"));
            imap.completed();
            smtp.completed();
            String expected = "user=" + USER + "\1auth=Bearer " + CREDENTIAL + "\1\1";
            assertEquals(expected, imap.authPayload);
            assertEquals(expected, smtp.authPayload);
            assertTrue(imap.commands.indexOf("STARTTLS") < imap.commands.indexOf("AUTHENTICATE"));
            assertTrue(smtp.commands.indexOf("STARTTLS") < smtp.commands.indexOf("AUTH"));
            assertFalse(imap.identified);
            assertEquals(0, smtp.dataCommands);
        }
    }

    @Test
    void realAuthenticationRejectionReportsWhetherImapOrSmtpFailedWithoutRawServerText()
            throws Exception {
        for (boolean rejectImap : new boolean[] {true, false}) {
            try (LocalMailServer imap = server(true, "ssl", false, true);
                    LocalMailServer smtp = server(false, "ssl", false, true)) {
                imap.rejectAuthentication = rejectImap;
                smtp.rejectAuthentication = !rejectImap;
                BusinessException failure =
                        assertThrows(
                                BusinessException.class,
                                () ->
                                        new MailGateway(true)
                                                .testConnection(
                                                        connection(imap, smtp, "ssl", "password")));
                assertTrue(failure.getMessage().startsWith(rejectImap ? "收件 IMAP" : "发件 SMTP"));
                assertTrue(failure.getMessage().contains("授权码"));
                assertFalse(failure.getMessage().contains("synthetic-raw-provider-secret"));
                imap.completed();
                if (!rejectImap) smtp.completed();
            }
        }
    }

    @Test
    void neteaseStyleServerCanUseImapLoginWhenItAdvertisesOnlyOauthAuthentication()
            throws Exception {
        try (LocalMailServer imap = server(true, "ssl", true, true);
                LocalMailServer smtp = server(false, "ssl", false, true)) {
            imap.advertisePlain = false;
            new MailGateway(true).testConnection(connection(imap, smtp, "ssl", "password"));
            imap.completed();
            smtp.completed();
            assertTrue(imap.commands.contains("LOGIN"));
            assertTrue(imap.identified);
        }
    }

    @Test
    void fetchUsesStableUidsAndPeekThenFlagUpdatesReachTheRemoteMessage() throws Exception {
        try (LocalMailServer imap = server(true, "ssl", true, true)) {
            imap.inboxHasMessage = true;
            var imported =
                    new MailGateway(true).fetchInbox(connection(imap, imap, "ssl", "password"));
            imap.completed();
            assertEquals(1, imported.size());
            var mail = imported.getFirst();
            assertEquals(5L, mail.uidValidity());
            assertEquals(42L, mail.uid());
            assertEquals("sender@example.com", mail.sender());
            assertEquals("recipient@example.com", mail.recipient());
            assertEquals("Local message", mail.subject());
            assertEquals("Local inbox body", mail.body());
            assertEquals(java.time.LocalDateTime.of(2026, 10, 14, 10, 0), mail.receivedAt());
            assertTrue(mail.unread());
            assertFalse(mail.starred());
            assertTrue(imap.peekRequested, "Import must not mark unread messages as read");
        }
        try (LocalMailServer imap = server(true, "ssl", true, true)) {
            imap.inboxHasMessage = true;
            new MailGateway(true)
                    .updateFlags(connection(imap, imap, "ssl", "password"), 5L, 42L, true, false);
            imap.completed();
            assertTrue(imap.flagChanges.stream().anyMatch(value -> value.contains("\\Flagged")));
            assertTrue(imap.flagChanges.stream().anyMatch(value -> value.contains("\\Seen")));
        }
    }

    @Test
    void missingStarttlsPreventsCredentialsFromBeingTransmitted() throws Exception {
        try (LocalMailServer imap = server(true, "starttls", false, false);
                LocalMailServer smtp = server(false, "starttls", false, false)) {
            assertThrows(
                    BusinessException.class,
                    () ->
                            new MailGateway(true)
                                    .testConnection(
                                            connection(imap, smtp, "starttls", "password")));
            imap.completed();
            assertFalse(imap.authenticated);
            assertNull(imap.authPayload);
            assertFalse(smtp.authenticated);
        }
    }

    @Test
    void acceptedSmtpDataRemainsSuccessfulWhenQuitFails() throws Exception {
        try (LocalMailServer smtp = server(false, "ssl", false, true)) {
            smtp.rejectQuit = true;
            MailConnectionBO account = connection(smtp, smtp, "ssl", "password");
            new MailGateway(true).send(account, "recipient@example.com", "中文主题", "真实协议测试正文");
            smtp.completed();
            assertEquals(1, smtp.dataCommands);
            MimeMessage accepted =
                    new MimeMessage(
                            Session.getInstance(new Properties()),
                            new ByteArrayInputStream(
                                    smtp.message.getBytes(StandardCharsets.UTF_8)));
            assertEquals("中文主题", accepted.getSubject());
            assertTrue(accepted.getContent().toString().contains("真实协议测试正文"));
            assertEquals(
                    USER,
                    ((jakarta.mail.internet.InternetAddress) accepted.getFrom()[0]).getAddress());
        }
    }

    @Test
    void explicitDataRejectionIsDefinitelyUnsent() throws Exception {
        try (LocalMailServer smtp = server(false, "ssl", false, true)) {
            smtp.rejectData = true;
            MailGateway.DeliveryException failure =
                    assertThrows(
                            MailGateway.DeliveryException.class,
                            () ->
                                    new MailGateway(true)
                                            .send(
                                                    connection(smtp, smtp, "ssl", "password"),
                                                    "recipient@example.com",
                                                    "Subject",
                                                    "Body"));
            assertTrue(failure.definitelyNotSent());
            smtp.completed();
        }
    }

    @Test
    void droppedFinalDataReplyRetainsAnUncertainDelivery() throws Exception {
        try (LocalMailServer smtp = server(false, "ssl", false, true)) {
            smtp.dropDataReply = true;
            MailGateway.DeliveryException failure =
                    assertThrows(
                            MailGateway.DeliveryException.class,
                            () ->
                                    new MailGateway(true)
                                            .send(
                                                    connection(smtp, smtp, "ssl", "password"),
                                                    "recipient@example.com",
                                                    "Subject",
                                                    "Body"));
            assertFalse(failure.definitelyNotSent());
            smtp.completed();
            assertEquals(1, smtp.dataCommands);
        }
    }

    @Test
    void defaultGatewayRejectsPrivateAddressesBeforeAuthenticating() throws Exception {
        for (boolean fakeIpOptIn : new boolean[] {false, true}) {
            try (LocalMailServer imap = server(true, "ssl", false, true);
                    LocalMailServer smtp = server(false, "ssl", false, true)) {
                assertThrows(
                        BusinessException.class,
                        () ->
                                new MailGateway(false, fakeIpOptIn)
                                        .testConnection(connection(imap, smtp, "ssl", "password")));
                assertFalse(imap.authenticated);
                assertFalse(smtp.authenticated);
            }
        }
    }

    private LocalMailServer server(
            boolean imap, String security, boolean requireId, boolean supportStarttls)
            throws IOException {
        return new LocalMailServer(imap, security, requireId, supportStarttls);
    }

    private static MailConnectionBO connection(
            LocalMailServer imap, LocalMailServer smtp, String security, String auth) {
        return new MailConnectionBO(
                3L,
                USER,
                "Mindforge Test",
                USER,
                "localhost",
                imap.port(),
                security,
                "localhost",
                smtp.port(),
                security,
                CREDENTIAL,
                auth);
    }

    private final class LocalMailServer implements AutoCloseable {
        private final boolean imap;
        private final String security;
        private final boolean requireId;
        private final boolean supportStarttls;
        private final ServerSocket listener =
                new ServerSocket(0, 1, InetAddress.getByName("127.0.0.1"));
        private final ExecutorService executor = Executors.newSingleThreadExecutor();
        private final Future<?> worker;
        private volatile Socket active;
        private volatile boolean authenticated;
        private volatile boolean identified;
        private volatile String authPayload;
        private volatile int dataCommands;
        private volatile String message = "";
        private volatile boolean rejectQuit;
        private volatile boolean rejectData;
        private volatile boolean dropDataReply;
        private volatile boolean advertisePlain = true;
        private volatile boolean rejectAuthentication;
        private volatile boolean inboxHasMessage;
        private volatile boolean peekRequested;
        private final List<String> flagChanges = new CopyOnWriteArrayList<>();
        private final List<String> commands = new CopyOnWriteArrayList<>();

        LocalMailServer(boolean imap, String security, boolean requireId, boolean supportStarttls)
                throws IOException {
            this.imap = imap;
            this.security = security;
            this.requireId = requireId;
            this.supportStarttls = supportStarttls;
            worker =
                    executor.submit(
                            () -> {
                                try (Socket accepted = listener.accept()) {
                                    active = accepted;
                                    accepted.setSoTimeout(5000);
                                    boolean encrypted = "ssl".equals(security);
                                    if (encrypted) active = upgrade(accepted);
                                    if (imap) handleImap(encrypted);
                                    else handleSmtp(encrypted);
                                } catch (SocketException failure) {
                                    if (!listener.isClosed()) throw new RuntimeException(failure);
                                } catch (Exception failure) {
                                    throw new RuntimeException(failure);
                                }
                            });
        }

        int port() {
            return listener.getLocalPort();
        }

        private Socket upgrade(Socket socket) throws IOException {
            SSLSocket secured =
                    (SSLSocket)
                            tls.getSocketFactory()
                                    .createSocket(socket, "localhost", socket.getPort(), true);
            secured.setUseClientMode(false);
            secured.setSoTimeout(5000);
            secured.startHandshake();
            return secured;
        }

        private void handleImap(boolean encrypted) throws Exception {
            BufferedReader input = reader();
            PrintWriter output = writer();
            output.print("* OK Local IMAP ready\r\n");
            output.flush();
            String line;
            while ((line = input.readLine()) != null) {
                String[] tokens = line.split(" ", 3);
                String tag = tokens[0], command = tokens[1].toUpperCase(Locale.ROOT);
                commands.add(command);
                switch (command) {
                    case "CAPABILITY" -> {
                        String capabilities = "IMAP4rev1 SASL-IR AUTH=XOAUTH2";
                        if (advertisePlain) capabilities += " AUTH=PLAIN";
                        if (requireId) capabilities += " ID";
                        if (!encrypted && supportStarttls)
                            capabilities += " STARTTLS LOGINDISABLED";
                        output.print(
                                "* CAPABILITY "
                                        + capabilities
                                        + "\r\n"
                                        + tag
                                        + " OK CAPABILITY\r\n");
                    }
                    case "STARTTLS" -> {
                        output.print(tag + " OK Begin TLS\r\n");
                        output.flush();
                        active = upgrade(active);
                        input = reader();
                        output = writer();
                        encrypted = true;
                    }
                    case "AUTHENTICATE" -> {
                        assertTrue(encrypted, "Credentials must only be sent after TLS");
                        if (rejectAuthentication) {
                            output.print(tag + " NO synthetic-raw-provider-secret\r\n");
                            break;
                        }
                        String[] auth = tokens[2].split(" ", 2);
                        String response;
                        if (auth.length == 2) response = auth[1];
                        else {
                            output.print("+ \r\n");
                            output.flush();
                            response = input.readLine();
                        }
                        authPayload =
                                new String(
                                        Base64.getDecoder().decode(response),
                                        StandardCharsets.UTF_8);
                        authenticated = true;
                        output.print(tag + " OK Authenticated\r\n");
                    }
                    case "LOGIN" -> {
                        if (rejectAuthentication) {
                            output.print(tag + " NO synthetic-raw-provider-secret\r\n");
                            break;
                        }
                        assertTrue(encrypted);
                        authenticated = true;
                        output.print(tag + " OK Authenticated\r\n");
                    }
                    case "ID" -> {
                        identified = true;
                        output.print("* ID (\"name\" \"Local fixture\")\r\n" + tag + " OK ID\r\n");
                    }
                    case "EXAMINE", "SELECT" -> {
                        assertTrue(authenticated);
                        if (requireId && !identified) output.print(tag + " NO Unsafe Login\r\n");
                        else
                            output.print(
                                    "* FLAGS (\\Seen \\Flagged)\r\n* "
                                            + (inboxHasMessage ? 1 : 0)
                                            + " EXISTS\r\n* 0 RECENT\r\n"
                                            + "* OK [UIDVALIDITY 5]\r\n* OK [UIDNEXT 43]\r\n"
                                            + tag
                                            + " OK ["
                                            + ("SELECT".equals(command)
                                                    ? "READ-WRITE"
                                                    : "READ-ONLY")
                                            + "] Opened\r\n");
                    }
                    case "FETCH", "UID" -> {
                        if (line.contains("BODY.PEEK")) peekRequested = true;
                        respondFetch(output, line);
                        output.print(tag + " OK FETCH\r\n");
                    }
                    case "STORE" -> {
                        flagChanges.add(tokens[2]);
                        output.print(tag + " OK STORE\r\n");
                    }
                    case "LOGOUT" -> {
                        output.print("* BYE Closing\r\n" + tag + " OK LOGOUT\r\n");
                        output.flush();
                        return;
                    }
                    default -> output.print(tag + " OK " + command + "\r\n");
                }
                output.flush();
            }
        }

        private void respondFetch(PrintWriter output, String request) {
            String prefix = "* 1 FETCH (UID 42 FLAGS () RFC822.SIZE 120 ";
            if (request.contains("BODYSTRUCTURE")) {
                output.print(
                        prefix
                                + "BODYSTRUCTURE (\"TEXT\" \"PLAIN\" (\"CHARSET\" \"UTF-8\") NIL"
                                + " NIL \"7BIT\" 16 1 NIL NIL NIL))\r\n");
            } else if (request.toUpperCase(Locale.ROOT).contains("HEADER.FIELDS")) {
                int start = request.toUpperCase(Locale.ROOT).indexOf("HEADER.FIELDS");
                int end = request.indexOf(']', start);
                String section = request.substring(start, end);
                String headers = "Content-Type: text/plain; charset=UTF-8\r\n\r\n";
                output.print(
                        prefix
                                + "BODY["
                                + section
                                + "] {"
                                + headers.getBytes(StandardCharsets.UTF_8).length
                                + "}\r\n"
                                + headers
                                + ")\r\n");
            } else if (request.contains("[TEXT]")) {
                String body = "Local inbox body";
                output.print(
                        prefix
                                + "BODY[TEXT]<0> {"
                                + body.getBytes(StandardCharsets.UTF_8).length
                                + "}\r\n"
                                + body
                                + ")\r\n");
            } else {
                output.print(
                        prefix
                                + "INTERNALDATE \"14-Oct-2026 10:00:00 +0800\" ENVELOPE (\"14 Oct"
                                + " 2026 10:00:00 +0800\" \"Local message\" ((NIL NIL \"sender\""
                                + " \"example.com\")) NIL NIL ((NIL NIL \"recipient\""
                                + " \"example.com\")) NIL NIL NIL \"<fixture@example.com>\"))\r\n");
            }
        }

        private void handleSmtp(boolean encrypted) throws Exception {
            BufferedReader input = reader();
            PrintWriter output = writer();
            output.print("220 localhost ESMTP fixture\r\n");
            output.flush();
            String line;
            while ((line = input.readLine()) != null) {
                String command = line.split(" ", 2)[0].toUpperCase(Locale.ROOT);
                commands.add(command);
                switch (command) {
                    case "EHLO", "HELO" -> {
                        output.print("250-localhost\r\n");
                        if (!encrypted && supportStarttls) output.print("250-STARTTLS\r\n");
                        output.print("250 AUTH PLAIN LOGIN XOAUTH2\r\n");
                    }
                    case "STARTTLS" -> {
                        output.print("220 Begin TLS\r\n");
                        output.flush();
                        active = upgrade(active);
                        input = reader();
                        output = writer();
                        encrypted = true;
                    }
                    case "AUTH" -> {
                        assertTrue(encrypted, "Credentials must only be sent after TLS");
                        if (rejectAuthentication) {
                            output.print("535 synthetic-raw-provider-secret\r\n");
                            break;
                        }
                        String[] auth = line.split(" ", 3);
                        String response;
                        if (auth.length == 3) response = auth[2];
                        else {
                            output.print("334 \r\n");
                            output.flush();
                            response = input.readLine();
                        }
                        authPayload =
                                new String(
                                        Base64.getDecoder().decode(response),
                                        StandardCharsets.UTF_8);
                        authenticated = true;
                        output.print("235 Authenticated\r\n");
                    }
                    case "MAIL", "RCPT", "RSET" -> {
                        assertTrue(authenticated);
                        output.print("250 OK\r\n");
                    }
                    case "DATA" -> {
                        assertTrue(authenticated);
                        dataCommands++;
                        output.print("354 End with dot\r\n");
                        output.flush();
                        StringBuilder content = new StringBuilder();
                        while ((line = input.readLine()) != null && !".".equals(line))
                            content.append(line).append("\r\n");
                        message = content.toString();
                        if (dropDataReply) {
                            active.close();
                            return;
                        }
                        output.print(rejectData ? "550 Rejected\r\n" : "250 Accepted\r\n");
                    }
                    case "QUIT" -> {
                        output.print(rejectQuit ? "550 QUIT rejected\r\n" : "221 Bye\r\n");
                        output.flush();
                        return;
                    }
                    default -> output.print("250 OK\r\n");
                }
                output.flush();
            }
        }

        private BufferedReader reader() throws IOException {
            return new BufferedReader(
                    new InputStreamReader(active.getInputStream(), StandardCharsets.UTF_8));
        }

        private PrintWriter writer() throws IOException {
            return new PrintWriter(
                    new OutputStreamWriter(active.getOutputStream(), StandardCharsets.UTF_8));
        }

        void completed() throws Exception {
            worker.get(10, TimeUnit.SECONDS);
        }

        @Override
        public void close() throws IOException {
            listener.close();
            if (active != null) active.close();
            executor.shutdownNow();
        }
    }
}
