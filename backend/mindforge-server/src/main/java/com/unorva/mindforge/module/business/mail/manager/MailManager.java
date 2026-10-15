package com.unorva.mindforge.module.business.mail.manager;

import com.unorva.mindforge.common.datasource.manager.BusinessLockManager;
import com.unorva.mindforge.common.datasource.support.DaoSupport;
import com.unorva.mindforge.common.exception.BusinessErrorCode;
import com.unorva.mindforge.common.exception.BusinessException;
import com.unorva.mindforge.module.business.mail.dao.*;
import com.unorva.mindforge.module.business.mail.domain.bo.*;
import com.unorva.mindforge.module.business.mail.domain.entity.*;
import com.unorva.mindforge.module.business.mail.domain.form.*;
import com.unorva.mindforge.module.business.mail.domain.vo.*;
import com.unorva.mindforge.module.business.mail.support.MailAccountConverter;
import com.unorva.mindforge.module.business.mail.support.MailCredentialCipher;

import org.springframework.stereotype.Component;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.*;

/** Database transactions for cached mail and delivery claims; never performs provider I/O. */
@Component
public class MailManager {
    private static final Set<String> FOLDERS = Set.of("inbox", "draft", "sent", "archive", "trash");
    private final MailDao mailDao;
    private final MailAccountDao accountDao;
    private final MailRemoteDao remoteDao;
    private final MailCredentialCipher cipher;
    private final BusinessLockManager locks;
    private final TransactionTemplate transactions;

    public MailManager(
            MailDao mailDao,
            MailAccountDao accountDao,
            MailRemoteDao remoteDao,
            MailCredentialCipher cipher,
            BusinessLockManager locks,
            PlatformTransactionManager transactionManager) {
        this.mailDao = mailDao;
        this.accountDao = accountDao;
        this.remoteDao = remoteDao;
        this.cipher = cipher;
        this.locks = locks;
        transactions = new TransactionTemplate(transactionManager);
        // The SMTP claim must commit before I/O, independently of any surrounding request
        // transaction.
        transactions.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
    }

    public List<MailVO> list(long userId, Long accountId) {
        if (accountId != null) requireAccount(userId, accountId);
        return mailDao.listOwned(userId, accountId).stream().map(MailManager::toVO).toList();
    }

    public MailConnectionBO requireConnection(long userId, long accountId) {
        return MailAccountConverter.connection(requireAccount(userId, accountId), cipher);
    }

    @Transactional(rollbackFor = Exception.class)
    public MailVO save(long userId, MailSaveForm form) {
        locks.lock(userId, "mail");
        MailVO current = form.id() == null ? null : get(userId, form.id());
        if (current != null) requireNotSending(current);
        if (current != null && !"draft".equals(current.folder())) {
            throw conflict("仅草稿可以修改正文或发件账户，请将此邮件复制为新草稿");
        }
        Long accountId =
                form.accountId() == null && current != null
                        ? current.accountId()
                        : form.accountId();
        if (accountId != null) requireAccount(userId, accountId);
        String folder = value(form.folder(), current == null ? "draft" : current.folder());
        requireFolder(folder);
        if (current == null && !"draft".equals(folder)) {
            throw conflict("新建邮件必须保存为草稿；收件箱由同步维护，已发送状态由发送结果维护");
        }
        requireFolderTransition(current, folder);
        MailVO mail =
                new MailVO(
                        current == null ? 0 : current.id(),
                        value(form.sender(), current == null ? "" : current.sender()),
                        value(form.recipient(), current == null ? "" : current.recipient()),
                        value(form.subject(), current == null ? "" : current.subject()),
                        value(form.body(), current == null ? "" : current.body()),
                        folder,
                        form.starred() == null
                                ? current != null && current.starred()
                                : form.starred(),
                        form.unread() == null ? current != null && current.unread() : form.unread(),
                        null,
                        null,
                        accountId);
        MailEntity entity = fromVO(userId, mail);
        long id;
        if (current == null) {
            entity.setId(null);
            DaoSupport.requireChanged(mailDao.insertOwned(entity));
            id = generatedId(entity);
        } else {
            if (remoteDao.selectForMail(userId, current.id()) != null) {
                throw conflict("服务商邮件正文不能在本地修改，请使用状态更新接口");
            }
            id = current.id();
            DaoSupport.requireChanged(mailDao.updateOwned(entity));
        }
        return get(userId, id);
    }

    /** Read the remote target before I/O; patch rechecks it under the transaction lock. */
    public MailPatchBO preparePatch(long userId, long id, MailPatchForm form) {
        MailVO current = get(userId, id);
        validatePatch(current, form);
        MailRemoteEntity remote = remoteDao.selectForMail(userId, id);
        if (remote == null || (form.starred() == null && form.unread() == null)) {
            return new MailPatchBO(id, current.accountId(), null, null, null);
        }
        return new MailPatchBO(
                id,
                current.accountId(),
                remote.getUidValidity(),
                remote.getRemoteUid(),
                requireConnection(userId, current.accountId()));
    }

    @Transactional(rollbackFor = Exception.class)
    public MailVO patch(long userId, long id, MailPatchForm form, MailPatchBO prepared) {
        locks.lock(userId, "mail");
        MailVO current = get(userId, id);
        validatePatch(current, form);
        if (!Objects.equals(current.accountId(), prepared.accountId()))
            throw conflict("邮件所属账户已变化，请刷新后重试");
        if (prepared.connection() != null) {
            MailRemoteEntity remote = remoteDao.selectForMail(userId, id);
            if (remote == null
                    || !Objects.equals(remote.getUidValidity(), prepared.uidValidity())
                    || !Objects.equals(remote.getRemoteUid(), prepared.remoteUid())
                    || !prepared.connection()
                            .equals(requireConnection(userId, current.accountId()))) {
                throw conflict("邮箱消息标识或配置已变化，请重新同步后重试");
            }
        }
        DaoSupport.requireChanged(
                mailDao.patchOwned(userId, id, form.folder(), form.starred(), form.unread()));
        return get(userId, id);
    }

    @Transactional(rollbackFor = Exception.class)
    public void delete(long userId, long id) {
        locks.lock(userId, "mail");
        requireNotSending(get(userId, id));
        // Keep an identity tombstone so a later sync does not resurrect a locally deleted cache
        // row.
        remoteDao.tombstone(userId, id);
        DaoSupport.requireChanged(mailDao.deleteOwned(userId, id));
    }

    public MailSyncSnapshotBO prepareSync(long userId, long accountId) {
        return Objects.requireNonNull(
                transactions.execute(
                        status -> {
                            locks.lock(userId, "mail");
                            MailConnectionBO connection = requireConnection(userId, accountId);
                            Map<Long, Long> versions = new HashMap<>();
                            for (MailFlagsVersionBO row :
                                    mailDao.selectFlagVersions(userId, accountId)) {
                                versions.put(
                                        row.getId(),
                                        Objects.requireNonNullElse(row.getFlagsVersion(), 0L));
                            }
                            return new MailSyncSnapshotBO(connection, versions);
                        }));
    }

    public MailSyncVO storeSync(
            long userId, MailSyncSnapshotBO snapshot, List<RemoteMailBO> remote) {
        MailConnectionBO connection = snapshot.connection();
        return transactions.execute(
                status -> {
                    locks.lock(userId, "mail");
                    long accountId = connection.id();
                    if (!connection.equals(requireConnection(userId, accountId)))
                        throw conflict("邮箱配置已变化，请重新同步");
                    Set<String> seen = new HashSet<>();
                    int synced = 0;
                    if (!remote.isEmpty()) {
                        long validity = remote.getFirst().uidValidity();
                        for (Long id :
                                remoteDao.selectObsoleteMailIds(userId, accountId, validity)) {
                            mailDao.deleteObsoleteRemote(userId, accountId, id);
                        }
                        remoteDao.deleteObsolete(userId, accountId, validity);
                    }
                    for (RemoteMailBO mail : remote) {
                        if (mail.uidValidity() <= 0
                                || mail.uid() <= 0
                                || !seen.add(mail.uidValidity() + ":" + mail.uid())) continue;
                        MailRemoteEntity identity =
                                remoteDao.selectIdentity(
                                        userId, accountId, mail.uidValidity(), mail.uid());
                        if (identity != null && identity.getMailId() == null) continue;
                        MailEntity entity = remoteEntity(userId, accountId, mail);
                        if (identity != null) {
                            entity.setId(identity.getMailId());
                            MailEntity current = mailDao.selectOwned(userId, identity.getMailId());
                            if (current != null
                                    && !Objects.equals(
                                            snapshot.flagVersions().get(current.getId()),
                                            Objects.requireNonNullElse(
                                                    current.getFlagsVersion(), 0L))) {
                                // A local flag update completed after this fetch started (including
                                // an ABA toggle).
                                // Preserve that update while refreshing the message content from
                                // the provider.
                                entity.setStarred(current.getStarred());
                                entity.setUnread(current.getUnread());
                            }
                            mailDao.refreshRemote(entity);
                        } else {
                            DaoSupport.requireChanged(mailDao.insertOwned(entity));
                            long id = generatedId(entity);
                            MailRemoteEntity link = new MailRemoteEntity();
                            link.setUserId(userId);
                            link.setAccountId(accountId);
                            link.setMailId(id);
                            link.setRemoteFolder("INBOX");
                            link.setUidValidity(mail.uidValidity());
                            link.setRemoteUid(mail.uid());
                            DaoSupport.requireChanged(remoteDao.insertIdentity(link));
                        }
                        synced++;
                    }
                    accountDao.syncSuccess(userId, accountId);
                    return new MailSyncVO(accountId, synced, "收件箱同步完成");
                });
    }

    public MailSendClaimBO claim(long userId, MailSendForm form) {
        return Objects.requireNonNull(
                transactions.execute(
                        status -> {
                            locks.lock(userId, "mail");
                            MailConnectionBO connection =
                                    requireConnection(userId, form.accountId());
                            MailVO current = form.id() == null ? null : get(userId, form.id());
                            if (current != null && !"draft".equals(current.folder()))
                                throw conflict("仅草稿可以发送；发送中或已发送邮件不能重复提交");
                            if (current != null
                                    && remoteDao.selectForMail(userId, current.id()) != null)
                                throw conflict("服务商收件邮件不能作为发送草稿");
                            MailVO draft =
                                    new MailVO(
                                            current == null ? 0 : current.id(),
                                            connection.email(),
                                            form.recipient().trim(),
                                            value(form.subject(), ""),
                                            value(form.body(), ""),
                                            "draft",
                                            current != null && current.starred(),
                                            false,
                                            null,
                                            null,
                                            form.accountId());
                            MailEntity entity = fromVO(userId, draft);
                            long id;
                            if (current == null) {
                                entity.setId(null);
                                DaoSupport.requireChanged(mailDao.insertOwned(entity));
                                id = generatedId(entity);
                            } else {
                                id = current.id();
                                DaoSupport.requireChanged(mailDao.updateOwned(entity));
                            }
                            String token = UUID.randomUUID().toString();
                            DaoSupport.requireChanged(mailDao.claim(userId, id, token));
                            return new MailSendClaimBO(id, token, connection);
                        }));
    }

    public MailVO finish(long userId, MailSendClaimBO claim, String folder) {
        if (!Set.of("sent", "draft").contains(folder))
            throw new IllegalArgumentException("Invalid send outcome");
        return transactions.execute(
                status -> {
                    locks.lock(userId, "mail");
                    if (mailDao.finishSend(userId, claim.id(), claim.token(), folder) != 1)
                        throw conflict("邮件发送状态已变化，请刷新后核对服务商记录");
                    if ("sent".equals(folder))
                        accountDao.connectionSuccess(userId, claim.connection().id());
                    return get(userId, claim.id());
                });
    }

    /**
     * Caller passes a fixed safe message; skip a stale failure if account settings changed during
     * I/O.
     */
    public void recordFailure(long userId, MailConnectionBO connection, String safeMessage) {
        transactions.executeWithoutResult(
                status -> {
                    locks.lock(userId, "mail");
                    MailAccountEntity account = accountDao.selectOwned(userId, connection.id());
                    if (account == null || !Boolean.TRUE.equals(account.getEnabled())) return;
                    if (!connection.equals(MailAccountConverter.connection(account, cipher)))
                        return;
                    accountDao.connectionFailure(
                            userId,
                            connection.id(),
                            safeMessage.substring(0, Math.min(500, safeMessage.length())));
                });
    }

    @Transactional(rollbackFor = Exception.class)
    public MailVO recoverSend(long userId, long id) {
        locks.lock(userId, "mail");
        MailVO mail = get(userId, id);
        if (!"sending".equals(mail.folder())) throw conflict("此邮件没有待确认的发送状态");
        // The database compares the claim timestamp and current time atomically in its own time
        // zone.
        // A LocalDateTime from JDBC must never be compared with the application server's local
        // clock.
        if (mailDao.recover(userId, id) != 1) {
            throw conflict("发送操作可能仍在进行，请在 5 分钟后核对服务商记录再恢复草稿");
        }
        return get(userId, id);
    }

    private MailVO get(long userId, long id) {
        MailEntity entity = mailDao.selectOwned(userId, id);
        if (entity == null) throw new BusinessException(BusinessErrorCode.NOT_FOUND);
        return toVO(entity);
    }

    private MailAccountEntity requireAccount(long userId, long accountId) {
        MailAccountEntity entity = accountDao.selectOwned(userId, accountId);
        if (entity == null) throw new BusinessException(BusinessErrorCode.NOT_FOUND);
        return entity;
    }

    private static void validatePatch(MailVO current, MailPatchForm form) {
        requireNotSending(current);
        if (form.folder() != null) {
            requireFolder(form.folder());
            requireFolderTransition(current, form.folder());
        }
    }

    private static MailVO toVO(MailEntity entity) {
        return new MailVO(
                entity.getId(),
                entity.getSender(),
                entity.getRecipient(),
                entity.getSubject(),
                entity.getBody(),
                entity.getFolder(),
                Boolean.TRUE.equals(entity.getStarred()),
                Boolean.TRUE.equals(entity.getUnread()),
                entity.getCreatedAt(),
                entity.getUpdatedAt(),
                entity.getAccountId());
    }

    private static MailEntity fromVO(long userId, MailVO mail) {
        MailEntity entity = new MailEntity();
        entity.setId(mail.id());
        entity.setUserId(userId);
        entity.setAccountId(mail.accountId());
        entity.setSender(mail.sender());
        entity.setRecipient(mail.recipient());
        entity.setSubject(mail.subject());
        entity.setBody(mail.body());
        entity.setFolder(mail.folder());
        entity.setStarred(mail.starred());
        entity.setUnread(mail.unread());
        entity.setCreatedAt(mail.createdAt());
        entity.setUpdatedAt(mail.updatedAt());
        return entity;
    }

    private static MailEntity remoteEntity(long userId, long accountId, RemoteMailBO mail) {
        MailEntity entity = new MailEntity();
        entity.setUserId(userId);
        entity.setAccountId(accountId);
        entity.setSender(mail.sender());
        entity.setRecipient(mail.recipient());
        entity.setSubject(mail.subject());
        entity.setBody(mail.body());
        entity.setFolder("inbox");
        entity.setStarred(mail.starred());
        entity.setUnread(mail.unread());
        entity.setCreatedAt(mail.receivedAt());
        return entity;
    }

    private static long generatedId(MailEntity entity) {
        if (entity.getId() == null)
            throw new BusinessException("保存失败，请稍后重试", BusinessErrorCode.CONFLICT);
        return entity.getId();
    }

    private static void requireNotSending(MailVO mail) {
        if ("sending".equals(mail.folder())) throw conflict("邮件发送结果尚未确认，请核对服务商记录后恢复草稿");
    }

    private static void requireFolder(String folder) {
        if (!FOLDERS.contains(folder))
            throw new BusinessException("邮件文件夹无效", BusinessErrorCode.INVALID_INPUT);
    }

    private static void requireFolderTransition(MailVO current, String folder) {
        if ("sent".equals(folder) && (current == null || !"sent".equals(current.folder())))
            throw conflict("已发送状态只能在邮件发送成功后设置");
        // Folder moves must not allow sent -> archive/trash -> draft to bypass the delivery claim.
        if (current != null && "draft".equals(folder) && !"draft".equals(current.folder()))
            throw conflict("此邮件不能恢复为发送草稿，请新建草稿；发送状态待确认时请使用恢复发送操作");
    }

    private static BusinessException conflict(String message) {
        return new BusinessException(message, BusinessErrorCode.CONFLICT);
    }

    private static String value(String supplied, String fallback) {
        return supplied == null ? fallback : supplied;
    }
}
