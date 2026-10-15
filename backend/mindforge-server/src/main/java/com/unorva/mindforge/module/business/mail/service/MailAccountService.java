package com.unorva.mindforge.module.business.mail.service;

import com.unorva.mindforge.common.exception.BusinessException;
import com.unorva.mindforge.module.business.mail.client.MailGateway;
import com.unorva.mindforge.module.business.mail.domain.form.MailAccountSaveForm;
import com.unorva.mindforge.module.business.mail.domain.vo.*;
import com.unorva.mindforge.module.business.mail.manager.MailAccountManager;

import lombok.RequiredArgsConstructor;

import org.springframework.stereotype.Service;

import java.util.List;

/** Provider presets and orchestration; network I/O never runs inside a database transaction. */
@Service
@RequiredArgsConstructor
public class MailAccountService {
    private static final List<ProviderVO> PROVIDERS =
            List.of(
                    new ProviderVO(
                            "qq",
                            "QQ 邮箱",
                            "imap.qq.com",
                            993,
                            "ssl",
                            "smtp.qq.com",
                            465,
                            "ssl",
                            "在 QQ 邮箱设置中开启 IMAP/SMTP 服务，使用生成的授权码。",
                            "https://service.mail.qq.com/",
                            "password"),
                    new ProviderVO(
                            "163",
                            "网易 163 邮箱",
                            "imap.163.com",
                            993,
                            "ssl",
                            "smtp.163.com",
                            465,
                            "ssl",
                            "开启 IMAP/SMTP 服务并使用客户端授权码。",
                            "https://help.mail.163.com/",
                            "password"),
                    new ProviderVO(
                            "126",
                            "网易 126 邮箱",
                            "imap.126.com",
                            993,
                            "ssl",
                            "smtp.126.com",
                            465,
                            "ssl",
                            "开启 IMAP/SMTP 服务并使用客户端授权码。",
                            "https://help.mail.163.com/",
                            "password"),
                    new ProviderVO(
                            "gmail",
                            "Gmail",
                            "imap.gmail.com",
                            993,
                            "ssl",
                            "smtp.gmail.com",
                            465,
                            "ssl",
                            "开启两步验证后创建应用专用密码；也支持 OAuth2，令牌需具备 https://mail.google.com/"
                                    + " 权限并在过期后手动更新；组织账户需管理员允许 IMAP。",
                            "https://support.google.com/accounts/answer/185833",
                            "password"),
                    new ProviderVO(
                            "outlook",
                            "Outlook / Hotmail",
                            "outlook.office365.com",
                            993,
                            "ssl",
                            "smtp-mail.outlook.com",
                            587,
                            "starttls",
                            "启用 IMAP 并填写 OAuth2 访问令牌，授权范围包含"
                                    + " https://outlook.office.com/IMAP.AccessAsUser.All 和"
                                    + " https://outlook.office.com/SMTP.Send；令牌过期后需手动更新，暂不自动刷新。",
                            "https://support.microsoft.com/en-gb/outlook/pop-imap-and-smtp-settings-for-outlook-com",
                            "oauth2"),
                    new ProviderVO(
                            "icloud",
                            "iCloud 邮箱",
                            "imap.mail.me.com",
                            993,
                            "ssl",
                            "smtp.mail.me.com",
                            587,
                            "starttls",
                            "使用 Apple 账户生成的 App 专用密码，SMTP 用户名为完整 iCloud 邮箱地址。",
                            "https://support.apple.com/102525",
                            "password"),
                    new ProviderVO(
                            "custom",
                            "自定义邮箱",
                            "",
                            993,
                            "ssl",
                            "",
                            465,
                            "ssl",
                            "填写服务商提供的 IMAP/SMTP 服务器、端口与授权码，连接必须使用 TLS。",
                            "",
                            "password"));

    private final MailAccountManager manager;
    private final MailGateway gateway;

    public List<ProviderVO> providers() {
        return PROVIDERS;
    }

    public List<MailAccountVO> list(long userId) {
        return manager.list(userId);
    }

    public MailAccountVO save(long userId, MailAccountSaveForm form) {
        return manager.save(userId, form, PROVIDERS);
    }

    public void delete(long userId, long id) {
        manager.delete(userId, id);
    }

    public ConnectionTestVO test(long userId, long accountId) {
        var connection = manager.requireConnection(userId, accountId);
        boolean success;
        String message;
        try {
            gateway.testConnection(connection);
            success = true;
            message = "IMAP 与 SMTP 连接验证成功";
        } catch (BusinessException exception) {
            success = false;
            // Gateway exposes only fixed safe diagnostics, retaining the failing IMAP/SMTP stage.
            message = exception.getMessage();
        }
        manager.recordTestResult(userId, connection, success, message);
        return new ConnectionTestVO(success, message);
    }
}
