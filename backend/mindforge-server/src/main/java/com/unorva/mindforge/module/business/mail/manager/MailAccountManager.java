package com.unorva.mindforge.module.business.mail.manager;

import com.unorva.mindforge.common.datasource.manager.BusinessLockManager;
import com.unorva.mindforge.common.datasource.support.DaoSupport;
import com.unorva.mindforge.common.exception.*;
import com.unorva.mindforge.module.business.mail.dao.*;
import com.unorva.mindforge.module.business.mail.domain.bo.MailConnectionBO;
import com.unorva.mindforge.module.business.mail.domain.entity.MailAccountEntity;
import com.unorva.mindforge.module.business.mail.domain.form.MailAccountSaveForm;
import com.unorva.mindforge.module.business.mail.domain.vo.*;
import com.unorva.mindforge.module.business.mail.support.*;

import lombok.RequiredArgsConstructor;

import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.net.IDN;
import java.util.List;
import java.util.Locale;
import java.util.Objects;

/**
 * Reusable mailbox configuration and credential operations with owner-scoped write transactions.
 */
@Component
@RequiredArgsConstructor
public class MailAccountManager {
    private static final int MAX_ACCOUNTS = 20;
    private final MailAccountDao accountDao;
    private final MailDao mailDao;
    private final MailRemoteDao remoteDao;
    private final BusinessLockManager locks;
    private final MailCredentialCipher cipher;

    public List<MailAccountVO> list(long userId) {
        return accountDao.listOwned(userId).stream()
                .map(entity -> MailAccountConverter.toVO(entity, cipher.configured()))
                .toList();
    }

    @Transactional(rollbackFor = Exception.class)
    public MailAccountVO save(long userId, MailAccountSaveForm param, List<ProviderVO> providers) {
        locks.lock(userId, "mail");
        MailAccountEntity stored = param.id() == null ? null : ownedEntity(userId, param.id());
        MailAccountVO current =
                stored == null ? null : MailAccountConverter.toVO(stored, cipher.configured());
        if (current == null && count(userId) >= MAX_ACCOUNTS) {
            throw new BusinessException("最多可配置 20 个邮箱账户", BusinessErrorCode.CONFLICT);
        }
        String provider = value(param.provider(), current == null ? "custom" : current.provider());
        ProviderVO preset =
                providers.stream()
                        .filter(item -> item.id().equals(provider))
                        .findFirst()
                        .orElseThrow(() -> invalid("请选择有效的邮箱服务商"));
        String email = normalizeEmail(value(param.email(), current == null ? "" : current.email()));
        String displayName =
                value(param.displayName(), current == null ? email : current.displayName()).trim();
        String username =
                value(param.username(), current == null ? email : current.username()).trim();
        String imapHost =
                normalizeHost(
                        value(
                                param.imapHost(),
                                current == null ? preset.imapHost() : current.imapHost()));
        int imapPort =
                port(param.imapPort(), current == null ? preset.imapPort() : current.imapPort());
        String imapSecurity =
                security(
                        value(
                                param.imapSecurity(),
                                current == null ? preset.imapSecurity() : current.imapSecurity()));
        String smtpHost =
                normalizeHost(
                        value(
                                param.smtpHost(),
                                current == null ? preset.smtpHost() : current.smtpHost()));
        int smtpPort =
                port(param.smtpPort(), current == null ? preset.smtpPort() : current.smtpPort());
        String smtpSecurity =
                security(
                        value(
                                param.smtpSecurity(),
                                current == null ? preset.smtpSecurity() : current.smtpSecurity()));
        String authType =
                value(param.authType(), current == null ? preset.authType() : current.authType());
        if (!("password".equals(authType) || "oauth2".equals(authType))) {
            throw invalid("认证方式必须是授权码或 OAuth2");
        }
        if (username.isBlank()
                || username.length() > 254
                || controlCharacters(username)
                || displayName.length() > 100
                || controlCharacters(displayName)) {
            throw invalid("请填写有效的用户名与显示名称");
        }
        boolean enabled =
                param.enabled() == null ? current == null || current.enabled() : param.enabled();
        boolean defaultAccount =
                param.isDefault() == null
                        ? current != null && current.isDefault()
                        : param.isDefault();
        if (defaultAccount && !enabled) {
            throw invalid("默认邮箱必须保持启用");
        }
        String ciphertext = stored == null ? null : stored.getPasswordCiphertext();
        boolean newPassword = StringUtils.hasText(param.password());
        if (newPassword) {
            int credentialLimit = "oauth2".equals(authType) ? 16000 : 2048;
            if (param.password().length() > credentialLimit
                    || controlCharacters(param.password())) {
                throw invalid("授权码或访问令牌格式不正确");
            }
            ciphertext = cipher.encrypt(userId, email, param.password());
        } else if (stored != null
                && !email.equals(current.email())
                && StringUtils.hasText(ciphertext)) {
            ciphertext =
                    cipher.encrypt(
                            userId, email, cipher.decrypt(userId, current.email(), ciphertext));
        }
        boolean connectionChanged =
                current == null
                        || newPassword
                        || !email.equals(current.email())
                        || !username.equals(current.username())
                        || !imapHost.equals(current.imapHost())
                        || imapPort != current.imapPort()
                        || !imapSecurity.equals(current.imapSecurity())
                        || !smtpHost.equals(current.smtpHost())
                        || smtpPort != current.smtpPort()
                        || !smtpSecurity.equals(current.smtpSecurity())
                        || !authType.equals(current.authType());
        boolean inboxIdentityChanged =
                current != null
                        && (!email.equals(current.email())
                                || !username.equals(current.username())
                                || !imapHost.equals(current.imapHost())
                                || imapPort != current.imapPort()
                                || !authType.equals(current.authType()));
        if (current != null && (connectionChanged || !enabled)) {
            requireNoSending(userId, current.id());
        }
        if (defaultAccount) {
            accountDao.clearDefault(userId);
        }
        long id;
        MailAccountVO account =
                new MailAccountVO(
                        current == null ? 0 : current.id(),
                        provider,
                        email,
                        displayName,
                        username,
                        imapHost,
                        imapPort,
                        imapSecurity,
                        smtpHost,
                        smtpPort,
                        smtpSecurity,
                        enabled,
                        defaultAccount,
                        StringUtils.hasText(ciphertext) && cipher.configured(),
                        connectionChanged ? "unverified" : current.status(),
                        connectionChanged ? null : current.lastError(),
                        current == null ? null : current.lastSyncAt(),
                        null,
                        null,
                        authType);
        MailAccountEntity entity = new MailAccountEntity();
        entity.setId(current == null ? null : current.id());
        entity.setUserId(userId);
        entity.setPasswordCiphertext(ciphertext);
        entity.setProvider(account.provider());
        entity.setEmail(account.email());
        entity.setDisplayName(account.displayName());
        entity.setUsername(account.username());
        entity.setImapHost(account.imapHost());
        entity.setImapPort(account.imapPort());
        entity.setImapSecurity(account.imapSecurity());
        entity.setSmtpHost(account.smtpHost());
        entity.setSmtpPort(account.smtpPort());
        entity.setSmtpSecurity(account.smtpSecurity());
        entity.setEnabled(account.enabled());
        entity.setAuthType(account.authType());
        entity.setStatus(account.status());
        entity.setLastError(account.lastError());
        entity.setDefaultAccount(account.isDefault());
        try {
            if (current == null) {
                DaoSupport.requireChanged(accountDao.insertOwned(entity));
                id = generatedId(entity.getId());
            } else {
                id = current.id();
                DaoSupport.requireChanged(accountDao.updateOwned(entity));
                if (inboxIdentityChanged) {
                    remoteDao.deleteForAccount(userId, id);
                    mailDao.deleteRemoteCache(userId, id);
                    accountDao.clearLastSync(userId, id);
                }
            }
        } catch (DuplicateKeyException exception) {
            throw new BusinessException("该邮箱已配置，请编辑已有账户", BusinessErrorCode.CONFLICT);
        }
        ensureDefault(userId);
        return requireOwned(userId, id);
    }

    @Transactional(rollbackFor = Exception.class)
    public void delete(long userId, long id) {
        locks.lock(userId, "mail");
        requireOwned(userId, id);
        requireNoSending(userId, id);
        remoteDao.deleteForAccount(userId, id);
        mailDao.deleteForAccount(userId, id);
        DaoSupport.requireChanged(accountDao.deleteOwned(userId, id));
        ensureDefault(userId);
    }

    public MailAccountVO requireOwned(long userId, long accountId) {
        return MailAccountConverter.toVO(ownedEntity(userId, accountId), cipher.configured());
    }

    public MailConnectionBO requireConnection(long userId, long accountId) {
        return MailAccountConverter.connection(ownedEntity(userId, accountId), cipher);
    }

    @Transactional(rollbackFor = Exception.class)
    public void recordTestResult(
            long userId, MailConnectionBO tested, boolean success, String safeMessage) {
        locks.lock(userId, "mail");
        if (!tested.equals(requireConnection(userId, tested.id()))) {
            throw new BusinessException("邮箱配置已变化，请重新验证连接", BusinessErrorCode.CONFLICT);
        }
        if (success) accountDao.connectionSuccess(userId, tested.id());
        else
            accountDao.connectionFailure(
                    userId,
                    tested.id(),
                    safeMessage.substring(0, Math.min(500, safeMessage.length())));
    }

    private MailAccountEntity ownedEntity(long userId, long id) {
        MailAccountEntity entity = accountDao.selectOwned(userId, id);
        if (entity == null) throw new BusinessException(BusinessErrorCode.NOT_FOUND);
        return entity;
    }

    private long count(long userId) {
        Long count = accountDao.countOwned(userId);
        return count == null ? 0 : count;
    }

    private void ensureDefault(long userId) {
        accountDao.clearDisabledDefault(userId);
        Long count = accountDao.countEnabledDefault(userId);
        if (count == null || count == 0) accountDao.assignFirstDefault(userId);
    }

    private void requireNoSending(long userId, long accountId) {
        Long count = mailDao.countSending(userId, accountId);
        if (count != null && count > 0) {
            throw new BusinessException(
                    "此邮箱存在发送状态待确认的邮件，请确认并恢复草稿后再修改或删除账户", BusinessErrorCode.CONFLICT);
        }
    }

    private static long generatedId(Long id) {
        if (id == null) throw new BusinessException("保存失败，请稍后重试", BusinessErrorCode.CONFLICT);
        return id;
    }

    private static String normalizeEmail(String raw) {
        String email = raw.trim().toLowerCase(Locale.ROOT);
        if (email.length() > 254
                || !email.matches("[^\\s@]+@[^\\s@]+\\.[^\\s@]+")
                || controlCharacters(email)) {
            throw invalid("请填写有效的邮箱地址");
        }
        return email;
    }

    static String normalizeHost(String raw) {
        try {
            String host =
                    IDN.toASCII(raw.trim(), IDN.USE_STD3_ASCII_RULES).toLowerCase(Locale.ROOT);
            if (host.isBlank()
                    || host.length() > 253
                    || host.contains("..")
                    || host.endsWith(".")
                    || !host.matches("[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?")) {
                throw new IllegalArgumentException("Invalid host");
            }
            return host;
        } catch (IllegalArgumentException exception) {
            throw invalid("邮箱服务器必须填写有效的主机名，不能包含协议、路径或端口");
        }
    }

    private static int port(Integer supplied, int fallback) {
        int port = supplied == null ? fallback : supplied;
        if (port < 1 || port > 65535) {
            throw invalid("邮箱服务器端口必须在 1 到 65535 之间");
        }
        return port;
    }

    private static String security(String value) {
        if (!("ssl".equals(value) || "starttls".equals(value))) {
            throw invalid("邮箱连接必须使用 SSL/TLS 或 STARTTLS");
        }
        return value;
    }

    private static boolean controlCharacters(String value) {
        return value.codePoints().anyMatch(Character::isISOControl);
    }

    private static BusinessException invalid(String message) {
        return new BusinessException(message, BusinessErrorCode.INVALID_INPUT);
    }

    private static String value(String supplied, String fallback) {
        return supplied == null ? Objects.requireNonNullElse(fallback, "") : supplied;
    }
}
