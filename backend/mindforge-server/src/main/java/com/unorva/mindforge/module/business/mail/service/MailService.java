package com.unorva.mindforge.module.business.mail.service;

import com.unorva.mindforge.common.exception.BusinessErrorCode;
import com.unorva.mindforge.common.exception.BusinessException;
import com.unorva.mindforge.module.business.mail.client.MailGateway;
import com.unorva.mindforge.module.business.mail.domain.bo.RemoteMailBO;
import com.unorva.mindforge.module.business.mail.domain.form.*;
import com.unorva.mindforge.module.business.mail.domain.vo.*;
import com.unorva.mindforge.module.business.mail.manager.MailManager;

import jakarta.mail.internet.InternetAddress;

import lombok.RequiredArgsConstructor;

import org.springframework.stereotype.Service;

import java.util.List;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionException;
import java.util.concurrent.ConcurrentHashMap;

/** Orchestrates provider I/O between committed manager transactions. */
@Service
@RequiredArgsConstructor
public class MailService {
    private final MailManager manager;
    private final MailGateway gateway;
    private final ConcurrentHashMap<SyncKey, CompletableFuture<MailSyncVO>> syncRequests = new ConcurrentHashMap<>();

    private record SyncKey(long userId, long accountId) {}

    public List<MailVO> list(long userId, Long accountId) {
        return manager.list(userId, accountId);
    }

    public long unreadCount(long userId) {
        return manager.unreadCount(userId);
    }

    public MailVO save(long userId, MailSaveForm form) {
        return manager.save(userId, form);
    }

    public void delete(long userId, long id) {
        manager.delete(userId, id);
    }

    public MailVO recoverSend(long userId, long id) {
        return manager.recoverSend(userId, id);
    }

    public MailVO patch(long userId, long id, MailPatchForm form) {
        var prepared = manager.preparePatch(userId, id, form);
        if (prepared.connection() != null) {
            gateway.updateFlags(
                    prepared.connection(), prepared.uidValidity(), prepared.remoteUid(), form.starred(), form.unread());
        }
        return manager.patch(userId, id, form, prepared);
    }

    public MailSyncVO sync(long userId, long accountId) {
        SyncKey key = new SyncKey(userId, accountId);
        CompletableFuture<MailSyncVO> request = new CompletableFuture<>();
        CompletableFuture<MailSyncVO> existing = syncRequests.putIfAbsent(key, request);
        if (existing != null) {
            try {
                return existing.join();
            } catch (CompletionException exception) {
                if (exception.getCause() instanceof RuntimeException cause) throw cause;
                if (exception.getCause() instanceof Error cause) throw cause;
                throw exception;
            }
        }
        try {
            MailSyncVO result = synchronize(userId, accountId);
            request.complete(result);
            return result;
        } catch (RuntimeException | Error exception) {
            request.completeExceptionally(exception);
            throw exception;
        } finally {
            syncRequests.remove(key, request);
        }
    }

    private MailSyncVO synchronize(long userId, long accountId) {
        var snapshot = manager.prepareSync(userId, accountId);
        var connection = snapshot.connection();
        List<RemoteMailBO> remote;
        try {
            remote = gateway.fetchInbox(connection, snapshot.cachedBodies());
        } catch (BusinessException exception) {
            manager.recordFailure(userId, connection, "收件箱同步失败，请检查邮箱认证与网络连接");
            throw exception;
        }
        return manager.storeSync(userId, snapshot, remote);
    }

    public MailVO send(long userId, MailSendForm form) {
        validateSend(form);
        var claim = manager.claim(userId, form);
        try {
            gateway.send(
                    claim.connection(), form.recipient().trim(), value(form.subject(), ""), value(form.body(), ""));
        } catch (MailGateway.DeliveryException exception) {
            if (exception.definitelyNotSent()) manager.finish(userId, claim, "draft");
            manager.recordFailure(userId, claim.connection(), "邮件发送失败，请检查邮箱认证、收件地址与网络连接");
            throw exception;
        } catch (RuntimeException exception) {
            // Unknown errors retain the claim; they do not prove SMTP rejected delivery.
            throw new BusinessException("邮件发送结果尚未确认，请在服务商核对后恢复草稿", BusinessErrorCode.PROVIDER_FAILED);
        }
        return manager.finish(userId, claim, "sent");
    }

    private static void validateSend(MailSendForm param) {
        if (param.accountId() == null
                || param.accountId() <= 0
                || (param.id() != null && param.id() <= 0)
                || param.recipient() == null
                || param.recipient().length() > 254
                || (param.subject() != null
                        && (param.subject().length() > 200
                                || param.subject().codePoints().anyMatch(Character::isISOControl)))
                || (param.body() != null && param.body().length() > 200000)) {
            throw new BusinessException("请填写有效的发送账户、收件地址和邮件内容", BusinessErrorCode.INVALID_INPUT);
        }
        try {
            InternetAddress[] addresses = InternetAddress.parse(param.recipient(), true);
            if (addresses.length != 1
                    || addresses[0].isGroup()
                    || param.recipient().codePoints().anyMatch(Character::isISOControl)) {
                throw new IllegalArgumentException("Invalid recipient");
            }
            addresses[0].validate();
        } catch (Exception exception) {
            throw new BusinessException("请填写一个有效的收件邮箱地址", BusinessErrorCode.INVALID_INPUT);
        }
    }

    private static String value(String supplied, String fallback) {
        return supplied == null ? fallback : supplied;
    }
}
