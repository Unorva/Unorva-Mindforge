package com.unorva.mindforge.module.business.mail.client;

import com.unorva.mindforge.common.exception.BusinessErrorCode;
import com.unorva.mindforge.common.exception.BusinessException;
import com.unorva.mindforge.module.business.mail.domain.bo.MailConnectionBO;
import com.unorva.mindforge.module.business.mail.domain.bo.MailRemoteIdentityBO;
import com.unorva.mindforge.module.business.mail.domain.bo.RemoteMailBO;

import jakarta.mail.Address;
import jakarta.mail.AuthenticationFailedException;
import jakarta.mail.FetchProfile;
import jakarta.mail.Flags;
import jakarta.mail.Folder;
import jakarta.mail.Message;
import jakarta.mail.MessageRemovedException;
import jakarta.mail.MessagingException;
import jakarta.mail.Multipart;
import jakarta.mail.Part;
import jakarta.mail.SendFailedException;
import jakarta.mail.Session;
import jakarta.mail.Store;
import jakarta.mail.Transport;
import jakarta.mail.UIDFolder;
import jakarta.mail.internet.ContentType;
import jakarta.mail.internet.InternetAddress;
import jakarta.mail.internet.MimeMessage;

import org.eclipse.angus.mail.imap.IMAPStore;
import org.eclipse.angus.mail.smtp.SMTPAddressFailedException;
import org.eclipse.angus.mail.smtp.SMTPSendFailedException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.io.InputStreamReader;
import java.io.Reader;
import java.io.StringReader;
import java.net.ConnectException;
import java.net.InetAddress;
import java.net.InetSocketAddress;
import java.net.NoRouteToHostException;
import java.net.Socket;
import java.net.SocketAddress;
import java.net.SocketTimeoutException;
import java.net.UnknownHostException;
import java.nio.charset.Charset;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Date;
import java.util.IdentityHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Properties;
import java.util.Set;

import javax.net.SocketFactory;
import javax.net.ssl.SSLException;
import javax.swing.text.MutableAttributeSet;
import javax.swing.text.html.HTML;
import javax.swing.text.html.HTMLEditorKit;
import javax.swing.text.html.parser.ParserDelegator;

/** Bounded, TLS-only IMAP/SMTP transport. No passwords or provider responses are exposed. */
@Component
public class MailGateway {
    static final int MAX_INBOX_MESSAGES = 200;
    static final int MAX_BODY_LENGTH = 200000;
    private static final int CONNECT_TIMEOUT_MS = 8000;
    private static final int IO_TIMEOUT_MS = 12000;
    private static final long SYNC_DEADLINE_NANOS = 90_000_000_000L;
    private static final ZoneId MAIL_TIME_ZONE = ZoneId.of("Asia/Shanghai");
    private static final Map<String, Integer> PROVIDER_FAKE_IP_ENDPOINTS =
            Map.ofEntries(
                    Map.entry("imap:imap.qq.com", 993), Map.entry("smtp:smtp.qq.com", 465),
                    Map.entry("imap:imap.163.com", 993), Map.entry("smtp:smtp.163.com", 465),
                    Map.entry("imap:imap.126.com", 993), Map.entry("smtp:smtp.126.com", 465),
                    Map.entry("imap:imap.gmail.com", 993), Map.entry("smtp:smtp.gmail.com", 465),
                    Map.entry("imap:outlook.office365.com", 993), Map.entry("smtp:smtp-mail.outlook.com", 587),
                    Map.entry("imap:imap.mail.me.com", 993), Map.entry("smtp:smtp.mail.me.com", 587));
    private final boolean allowPrivateHosts;
    private final boolean allowProviderFakeIp;

    public MailGateway(boolean allowPrivateHosts) {
        this(allowPrivateHosts, false);
    }

    @Autowired
    public MailGateway(
            @Value("${mindforge.mail.allow-private-hosts:false}") boolean allowPrivateHosts,
            @Value("${mindforge.mail.allow-provider-fake-ip:false}") boolean allowProviderFakeIp) {
        this.allowPrivateHosts = allowPrivateHosts;
        this.allowProviderFakeIp = allowProviderFakeIp;
    }

    /** The provider confirmed absence; the caller may retain and update the local copy. */
    public static final class MissingMessageException extends BusinessException {
        public MissingMessageException() {
            super("邮件已不在服务商收件箱中", BusinessErrorCode.NOT_FOUND);
        }
    }

    /** The caller must retain the send claim after an ambiguous network failure. */
    public static final class DeliveryException extends BusinessException {
        private final boolean definitelyNotSent;

        public DeliveryException(boolean definitelyNotSent) {
            super(
                    definitelyNotSent ? "邮件发送失败，请检查收件地址、授权信息或服务器配置；草稿已保留" : "邮件发送结果尚未确认，请先在邮箱服务商核对已发送邮件，再解除发送锁重试",
                    BusinessErrorCode.PROVIDER_FAILED);
            this.definitelyNotSent = definitelyNotSent;
        }

        public boolean definitelyNotSent() {
            return definitelyNotSent;
        }
    }

    public void testConnection(MailConnectionBO account) {
        try (Store store = openInboxStore(account)) {
            Folder inbox = store.getFolder("INBOX");
            try {
                inbox.open(Folder.READ_ONLY);
            } finally {
                if (inbox.isOpen()) inbox.close(false);
            }
        } catch (MessagingException | RuntimeException exception) {
            throw connectionFailure("收件 IMAP", account.authType(), exception);
        }
        try (Transport transport = smtpSession(account).getTransport("smtp")) {
            transport.connect(account.smtpHost(), account.smtpPort(), account.username(), account.password());
        } catch (MessagingException | RuntimeException exception) {
            throw connectionFailure("发件 SMTP", account.authType(), exception);
        }
    }

    public List<RemoteMailBO> fetchInbox(MailConnectionBO account) {
        return fetchInbox(account, Map.of());
    }

    public List<RemoteMailBO> fetchInbox(MailConnectionBO account, Map<MailRemoteIdentityBO, String> cachedBodies) {
        long deadline = System.nanoTime() + SYNC_DEADLINE_NANOS;
        try (Store store = openInboxStore(account)) {
            Folder inbox = store.getFolder("INBOX");
            try {
                inbox.open(Folder.READ_ONLY);
                if (!(inbox instanceof UIDFolder uidFolder)) throw connectionFailure();
                int count = inbox.getMessageCount();
                if (count == 0) return List.of();
                Message[] messages = inbox.getMessages(Math.max(1, count - MAX_INBOX_MESSAGES + 1), count);
                FetchProfile profile = new FetchProfile();
                profile.add(FetchProfile.Item.ENVELOPE);
                profile.add(FetchProfile.Item.FLAGS);
                profile.add(FetchProfile.Item.SIZE);
                profile.add(UIDFolder.FetchProfileItem.UID);
                inbox.fetch(messages, profile);
                long uidValidity = uidFolder.getUIDValidity();
                List<RemoteMailBO> result = new ArrayList<>();
                for (int index = messages.length - 1; index >= 0; index--) {
                    if (System.nanoTime() > deadline) break;
                    Message message = messages[index];
                    if (message.isExpunged()) continue;
                    long uid = uidFolder.getUID(message);
                    if (uid < 1 || uidValidity < 1) continue;
                    // Large messages and attachments are deliberately not downloaded into the local
                    // cache.
                    String cached = cachedBodies.get(new MailRemoteIdentityBO(uidValidity, uid));
                    String body =
                            cached != null
                                    ? cached
                                    : message.getSize() > 2_000_000
                                            ? "此邮件较大，请在邮箱服务商查看完整内容与附件。"
                                            : extractText(message, 0, new int[] {64});
                    Date received = message.getReceivedDate();
                    if (received == null) received = message.getSentDate();
                    result.add(
                            new RemoteMailBO(
                                    uidValidity,
                                    uid,
                                    addresses(message.getFrom()),
                                    addresses(message.getRecipients(Message.RecipientType.TO)),
                                    bounded(message.getSubject(), 200),
                                    bounded(body, MAX_BODY_LENGTH),
                                    message.isSet(Flags.Flag.FLAGGED),
                                    !message.isSet(Flags.Flag.SEEN),
                                    received == null
                                            ? LocalDateTime.now(MAIL_TIME_ZONE)
                                            : LocalDateTime.ofInstant(received.toInstant(), MAIL_TIME_ZONE)));
                }
                return result;
            } finally {
                if (inbox.isOpen()) inbox.close(false);
            }
        } catch (MessagingException | IOException | RuntimeException exception) {
            throw new BusinessException("收件箱同步失败，请检查邮箱授权信息、TLS 与网络连接", BusinessErrorCode.PROVIDER_FAILED);
        }
    }

    public void send(MailConnectionBO account, String recipient, String subject, String body) {
        boolean transmissionStarted = false;
        boolean transmissionAccepted = false;
        try (Transport transport = smtpSession(account).getTransport("smtp")) {
            MimeMessage message = new MimeMessage(smtpSession(account));
            message.setFrom(new InternetAddress(account.email(), account.displayName(), "UTF-8"));
            InternetAddress address = singleRecipient(recipient);
            message.setRecipient(Message.RecipientType.TO, address);
            message.setSubject(subject == null ? "" : subject, "UTF-8");
            message.setText(body == null ? "" : body, "UTF-8");
            message.setSentDate(new Date());
            message.saveChanges();
            transport.connect(account.smtpHost(), account.smtpPort(), account.username(), account.password());
            transmissionStarted = true;
            transport.sendMessage(message, new Address[] {address});
            transmissionAccepted = true;
        } catch (SendFailedException exception) {
            if (transmissionAccepted) return; // A failed QUIT cannot undo a confirmed DATA response.
            throw new DeliveryException(!transmissionStarted || definitelyRejected(exception));
        } catch (MessagingException | IOException | RuntimeException exception) {
            if (transmissionAccepted) return;
            throw new DeliveryException(!transmissionStarted);
        }
    }

    /** Missing validSent addresses alone is not evidence that a timed-out DATA command was rejected. */
    static boolean definitelyRejected(SendFailedException exception) {
        if (exception.getValidSentAddresses() != null && exception.getValidSentAddresses().length > 0) return false;
        if (exception instanceof SMTPSendFailedException smtp) {
            return smtp.getReturnCode() >= 400 && smtp.getReturnCode() <= 599;
        }
        Exception nested = exception.getNextException();
        if (nested instanceof SMTPAddressFailedException address) {
            return address.getReturnCode() >= 400 && address.getReturnCode() <= 599;
        }
        return false;
    }

    public void updateFlags(
            MailConnectionBO account, long uidValidity, long remoteUid, Boolean starred, Boolean unread) {
        try (Store store = openInboxStore(account)) {
            Folder inbox = store.getFolder("INBOX");
            try {
                inbox.open(Folder.READ_WRITE);
                if (!(inbox instanceof UIDFolder uidFolder) || uidFolder.getUIDValidity() != uidValidity) {
                    throw new BusinessException("邮箱消息标识已变化，请先重新同步", BusinessErrorCode.CONFLICT);
                }
                Message message = uidFolder.getMessageByUID(remoteUid);
                if (message == null || message.isExpunged()) throw new MissingMessageException();
                if (starred != null) message.setFlag(Flags.Flag.FLAGGED, starred);
                if (unread != null) message.setFlag(Flags.Flag.SEEN, !unread);
            } finally {
                if (inbox.isOpen()) inbox.close(false);
            }
        } catch (MessageRemovedException exception) {
            throw new MissingMessageException();
        } catch (BusinessException exception) {
            throw exception;
        } catch (MessagingException | RuntimeException exception) {
            throw new BusinessException("服务商邮件状态更新失败，请稍后重试", BusinessErrorCode.PROVIDER_FAILED);
        }
    }

    private Store openInboxStore(MailConnectionBO account) throws MessagingException {
        Session session =
                Session.getInstance(properties("imap", account.imapHost(), account.imapSecurity(), account.authType()));
        Store store = session.getStore("imap");
        try {
            store.connect(account.imapHost(), account.imapPort(), account.username(), account.password());
            // NetEase/Coremail requires client identification before EXAMINE or SELECT.
            // Only send the extension when advertised, preserving compatibility with other servers.
            if (store instanceof IMAPStore imap && imap.hasCapability("ID")) {
                imap.id(Map.of("name", "Mindforge", "version", "1.0", "vendor", "Unorva"));
            }
            return store;
        } catch (MessagingException | RuntimeException exception) {
            try {
                store.close();
            } catch (MessagingException ignored) {
                /* Preserve the original failure. */
            }
            throw exception;
        }
    }

    private Session smtpSession(MailConnectionBO account) {
        return Session.getInstance(properties("smtp", account.smtpHost(), account.smtpSecurity(), account.authType()));
    }

    Properties properties(String protocol, String host, String security, String authType) {
        if (!"ssl".equals(security) && !"starttls".equals(security)) {
            throw new BusinessException("邮箱连接必须使用 SSL/TLS 或 STARTTLS", BusinessErrorCode.INVALID_INPUT);
        }
        Properties properties = new Properties();
        String prefix = "mail." + protocol;
        properties.setProperty(prefix + ".connectiontimeout", Integer.toString(CONNECT_TIMEOUT_MS));
        properties.setProperty(prefix + ".timeout", Integer.toString(IO_TIMEOUT_MS));
        properties.setProperty(prefix + ".writetimeout", Integer.toString(IO_TIMEOUT_MS));
        properties.setProperty(prefix + ".ssl.enable", Boolean.toString("ssl".equals(security)));
        properties.setProperty(prefix + ".ssl.checkserveridentity", "true");
        properties.setProperty(prefix + ".ssl.protocols", "TLSv1.3 TLSv1.2");
        properties.setProperty(prefix + ".starttls.enable", Boolean.toString("starttls".equals(security)));
        properties.setProperty(prefix + ".starttls.required", Boolean.toString("starttls".equals(security)));
        properties.setProperty(prefix + ".socketFactory.fallback", "false");
        properties.put(
                prefix + ".socketFactory",
                new VerifiedSocketFactory(protocol, host, allowPrivateHosts, allowProviderFakeIp));
        properties.setProperty(prefix + ".auth", "true");
        properties.setProperty(prefix + ".auth.mechanisms", "oauth2".equals(authType) ? "XOAUTH2" : "PLAIN LOGIN");
        properties.setProperty(prefix + ".auth.xoauth2.disable", Boolean.toString(!"oauth2".equals(authType)));
        if ("oauth2".equals(authType)) {
            properties.setProperty(prefix + ".auth.login.disable", "true");
            properties.setProperty(prefix + ".auth.plain.disable", "true");
        }
        properties.setProperty("mail.imap.peek", "true");
        properties.setProperty("mail.imap.fetchsize", "16384");
        properties.setProperty("mail.imap.connectionpoolsize", "1");
        properties.setProperty("mail.smtp.sendpartial", "false");
        properties.setProperty("mail.debug", "false");
        properties.setProperty("mail.debug.auth", "false");
        return properties;
    }

    static InternetAddress singleRecipient(String recipient) throws MessagingException {
        InternetAddress[] addresses = InternetAddress.parse(recipient == null ? "" : recipient, true);
        if (addresses.length != 1 || addresses[0].isGroup()) throw new MessagingException("Invalid recipient");
        addresses[0].validate();
        return addresses[0];
    }

    static String extractText(Part part, int depth, int[] partsLeft) throws MessagingException, IOException {
        if (depth > 8
                || partsLeft[0]-- <= 0
                || Part.ATTACHMENT.equalsIgnoreCase(part.getDisposition())
                || part.getFileName() != null) return "";
        if (part.isMimeType("text/plain")) return readText(part);
        if (part.isMimeType("text/html")) return htmlToText(readText(part));
        if (part.isMimeType("multipart/*")) {
            Multipart multipart = (Multipart) part.getContent();
            String fallback = "";
            int count = Math.min(multipart.getCount(), 64);
            for (int index = 0; index < count; index++) {
                Part child = multipart.getBodyPart(index);
                if (child.isMimeType("text/plain")
                        && child.getFileName() == null
                        && !Part.ATTACHMENT.equalsIgnoreCase(child.getDisposition())) {
                    return extractText(child, depth + 1, partsLeft);
                }
                String text = extractText(child, depth + 1, partsLeft);
                if (fallback.isBlank() && !text.isBlank()) fallback = text;
            }
            return fallback;
        }
        return "";
    }

    private static String readText(Part part) throws MessagingException, IOException {
        Charset charset = StandardCharsets.UTF_8;
        try {
            String declared = new ContentType(part.getContentType()).getParameter("charset");
            if (declared != null) charset = Charset.forName(declared);
        } catch (Exception ignored) {
            /* Malformed charset falls back to UTF-8. */
        }
        StringBuilder result = new StringBuilder();
        try (Reader reader = new InputStreamReader(part.getInputStream(), charset)) {
            char[] buffer = new char[4096];
            int count;
            while (result.length() < MAX_BODY_LENGTH
                    && (count = reader.read(buffer, 0, Math.min(buffer.length, MAX_BODY_LENGTH - result.length())))
                            != -1) {
                result.append(buffer, 0, count);
            }
        }
        return result.toString();
    }

    static String htmlToText(String html) throws IOException {
        StringBuilder result = new StringBuilder();
        new ParserDelegator()
                .parse(
                        new StringReader(html),
                        new HTMLEditorKit.ParserCallback() {
                            private int hidden;

                            @Override
                            public void handleStartTag(HTML.Tag tag, MutableAttributeSet attributes, int position) {
                                if (tag == HTML.Tag.SCRIPT || tag == HTML.Tag.STYLE) hidden++;
                                if (tag.isBlock() && hidden == 0) result.append('\n');
                            }

                            @Override
                            public void handleEndTag(HTML.Tag tag, int position) {
                                if ((tag == HTML.Tag.SCRIPT || tag == HTML.Tag.STYLE) && hidden > 0) hidden--;
                                if (tag.isBlock() && hidden == 0) result.append('\n');
                            }

                            @Override
                            public void handleSimpleTag(HTML.Tag tag, MutableAttributeSet attributes, int position) {
                                if (tag == HTML.Tag.BR && hidden == 0) result.append('\n');
                            }

                            @Override
                            public void handleText(char[] data, int position) {
                                if (hidden == 0) result.append(data);
                            }
                        },
                        true);
        return bounded(result.toString().replaceAll("\\n{3,}", "\n\n").trim(), MAX_BODY_LENGTH);
    }

    private static String addresses(Address[] addresses) {
        if (addresses == null || addresses.length == 0) return "";
        List<String> values = new ArrayList<>();
        for (Address address : addresses) {
            values.add(address instanceof InternetAddress internet ? internet.getAddress() : address.toString());
        }
        return bounded(String.join(", ", values), 254);
    }

    static String bounded(String value, int maximum) {
        return value == null ? "" : value.substring(0, Math.min(value.length(), maximum));
    }

    private static BusinessException connectionFailure() {
        return new BusinessException("邮箱连接失败，请检查 IMAP/SMTP 地址、TLS、授权码或 OAuth2 令牌", BusinessErrorCode.PROVIDER_FAILED);
    }

    /** Provider errors are classified by type; raw responses, host details and credentials stay private. */
    static BusinessException connectionFailure(String stage, String authType, Throwable failure) {
        String detail;
        if (hasFailure(failure, AuthenticationFailedException.class)) {
            detail =
                    "oauth2".equals(authType)
                            ? "认证失败，请确认 OAuth2 访问令牌有效、尚未过期，并已授予 IMAP 与 SMTP 权限"
                            : "认证失败，请确认已开启 IMAP/SMTP 服务并填写客户端授权码或 App 专用密码；QQ、网易邮箱不能直接使用登录密码";
        } else if (hasFailure(failure, FakeProxyMailHostException.class)) {
            detail = "服务器被 DNS 解析到代理的虚拟地址（Fake-IP），当前安全策略已阻止连接；请将代理 DNS 切换为真实 IP 模式，或为邮箱服务器设置真实 DNS" + " 后重试";
        } else if (hasFailure(failure, BlockedMailHostException.class)) {
            detail = "服务器解析为本地或内网地址，连接已被阻止；请检查 DNS，或让管理员确认内网邮箱访问配置";
        } else if (hasFailure(failure, UnknownHostException.class)) {
            detail = "服务器域名无法解析，请检查邮箱服务器地址和 DNS 网络连接";
        } else if (hasFailure(failure, SocketTimeoutException.class)) {
            detail = "连接或读取超时，请检查网络、防火墙及邮箱服务器端口，稍后重试";
        } else if (hasFailure(failure, SSLException.class)) {
            detail = "TLS 握手或证书验证失败，请确认服务器域名、端口与 SSL/STARTTLS 配置正确";
        } else if (hasFailure(failure, ConnectException.class) || hasFailure(failure, NoRouteToHostException.class)) {
            detail = "无法连接服务器，请检查服务器端口、网络、防火墙及服务商连接限制";
        } else {
            detail = "连接失败，请确认服务器、SSL/STARTTLS 配置、邮箱授权与网络连接";
        }
        return new BusinessException(stage + " " + detail, BusinessErrorCode.PROVIDER_FAILED);
    }

    private static boolean hasFailure(Throwable failure, Class<? extends Throwable> expected) {
        Set<Throwable> seen = Collections.newSetFromMap(new IdentityHashMap<>());
        ArrayDeque<Throwable> pending = new ArrayDeque<>();
        if (failure != null) pending.add(failure);
        while (!pending.isEmpty() && seen.size() < 32) {
            Throwable current = pending.removeFirst();
            if (!seen.add(current)) continue;
            if (expected.isInstance(current)) return true;
            if (current.getCause() != null) pending.add(current.getCause());
            if (current instanceof MessagingException messaging && messaging.getNextException() != null) {
                pending.add(messaging.getNextException());
            }
        }
        return false;
    }

    static class BlockedMailHostException extends IOException {
        BlockedMailHostException() {
            super("Private mail server is not allowed");
        }
    }

    static final class FakeProxyMailHostException extends BlockedMailHostException {}

    static boolean isFakeProxyAddress(InetAddress address) {
        byte[] bytes = address.getAddress();
        return bytes.length == 4
                && Byte.toUnsignedInt(bytes[0]) == 198
                && (Byte.toUnsignedInt(bytes[1]) == 18 || Byte.toUnsignedInt(bytes[1]) == 19);
    }

    /** Opt-in proxy compatibility is restricted to exact built-in protocol/host/port endpoints. */
    static boolean providerFakeIpAllowed(boolean enabled, String protocol, String host, int port, InetAddress address) {
        if (!enabled
                || host == null
                || !("imap".equals(protocol) || "smtp".equals(protocol))
                || !isFakeProxyAddress(address)) return false;
        Integer presetPort = PROVIDER_FAKE_IP_ENDPOINTS.get(protocol + ":" + host.toLowerCase(Locale.ROOT));
        return presetPort != null && presetPort == port;
    }

    static void verifyResolvedAddresses(
            String protocol,
            String host,
            int port,
            boolean allowPrivate,
            boolean allowProviderFakeIp,
            InetAddress[] resolved)
            throws IOException {
        if (resolved.length == 0) throw new IOException("Mail server did not resolve");
        // Every answer must pass; a mixed response cannot hide an internal address behind a
        // Fake-IP.
        for (InetAddress candidate : resolved) {
            if (!allowPrivate
                    && isPrivateAddress(candidate)
                    && !providerFakeIpAllowed(allowProviderFakeIp, protocol, host, port, candidate)) {
                if (isFakeProxyAddress(candidate)) throw new FakeProxyMailHostException();
                throw new BlockedMailHostException();
            }
        }
    }

    static boolean isPrivateAddress(InetAddress address) {
        if (address.isAnyLocalAddress()
                || address.isLoopbackAddress()
                || address.isLinkLocalAddress()
                || address.isSiteLocalAddress()
                || address.isMulticastAddress()) return true;
        byte[] bytes = address.getAddress();
        if (bytes.length == 4) {
            int first = Byte.toUnsignedInt(bytes[0]);
            int second = Byte.toUnsignedInt(bytes[1]);
            return first == 0
                    || first >= 224
                    || (first == 100 && second >= 64 && second <= 127)
                    || (first == 198 && (second == 18 || second == 19));
        }
        // ULA is not covered by InetAddress.isSiteLocalAddress().
        return (Byte.toUnsignedInt(bytes[0]) & 0xfe) == 0xfc;
    }

    /** Resolve and validate at connect time; connect to that exact address to avoid DNS rebinding. */
    static final class VerifiedSocketFactory extends SocketFactory {
        private final String protocol;
        private final String host;
        private final boolean allowPrivate;
        private final boolean allowProviderFakeIp;

        VerifiedSocketFactory(String protocol, String host, boolean allowPrivate, boolean allowProviderFakeIp) {
            this.protocol = protocol;
            this.host = host;
            this.allowPrivate = allowPrivate;
            this.allowProviderFakeIp = allowProviderFakeIp;
        }

        @Override
        public Socket createSocket() {
            return new VerifiedSocket(protocol, host, allowPrivate, allowProviderFakeIp);
        }

        @Override
        public Socket createSocket(String host, int port) throws IOException {
            Socket socket = createSocket();
            socket.connect(InetSocketAddress.createUnresolved(host, port), CONNECT_TIMEOUT_MS);
            return socket;
        }

        @Override
        public Socket createSocket(String host, int port, InetAddress localHost, int localPort) throws IOException {
            Socket socket = createSocket();
            socket.bind(new InetSocketAddress(localHost, localPort));
            socket.connect(InetSocketAddress.createUnresolved(host, port), CONNECT_TIMEOUT_MS);
            return socket;
        }

        @Override
        public Socket createSocket(InetAddress host, int port) throws IOException {
            return createSocket(host.getHostAddress(), port);
        }

        @Override
        public Socket createSocket(InetAddress host, int port, InetAddress localHost, int localPort)
                throws IOException {
            return createSocket(host.getHostAddress(), port, localHost, localPort);
        }
    }

    private static final class VerifiedSocket extends Socket {
        private final String protocol;
        private final String expectedHost;
        private final boolean allowPrivate;
        private final boolean allowProviderFakeIp;

        VerifiedSocket(String protocol, String expectedHost, boolean allowPrivate, boolean allowProviderFakeIp) {
            this.protocol = protocol;
            this.expectedHost = expectedHost;
            this.allowPrivate = allowPrivate;
            this.allowProviderFakeIp = allowProviderFakeIp;
        }

        @Override
        public void connect(SocketAddress endpoint, int timeout) throws IOException {
            if (!(endpoint instanceof InetSocketAddress address) || expectedHost == null || expectedHost.isBlank()) {
                throw new IOException("Invalid mail server");
            }
            InetAddress[] resolved = InetAddress.getAllByName(expectedHost);
            verifyResolvedAddresses(
                    protocol, expectedHost, address.getPort(), allowPrivate, allowProviderFakeIp, resolved);
            // SocketFetcher wraps this verified socket in the default SSL socket, retaining TLS
            // hostname validation.
            super.connect(
                    new InetSocketAddress(resolved[0], address.getPort()), timeout > 0 ? timeout : CONNECT_TIMEOUT_MS);
        }

        @Override
        public void connect(SocketAddress endpoint) throws IOException {
            connect(endpoint, CONNECT_TIMEOUT_MS);
        }
    }
}
