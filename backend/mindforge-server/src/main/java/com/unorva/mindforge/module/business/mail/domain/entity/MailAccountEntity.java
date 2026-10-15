package com.unorva.mindforge.module.business.mail.domain.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import java.time.LocalDateTime;

/** Persistent owner-scoped mf_mail_account row. */
@Data
@TableName("mf_mail_account")
public class MailAccountEntity {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long userId;
    private String provider;
    private String email;
    private String displayName;
    private String username;
    private String authType;
    private String imapHost;
    private Integer imapPort;
    private String imapSecurity;
    private String smtpHost;
    private Integer smtpPort;
    private String smtpSecurity;
    private String passwordCiphertext;
    private Boolean enabled;
    @TableField("is_default")
    private Boolean defaultAccount;
    private String status;
    private String lastError;
    private LocalDateTime lastSyncAt;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    @Override public String toString() { return "MailAccountEntity[id=" + id + ", passwordCiphertext=REDACTED]"; }
}
