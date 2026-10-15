package com.unorva.mindforge.module.business.mail.domain.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import java.time.LocalDateTime;

/** IMAP composite identity; BaseMapper ID methods are intentionally unused. */
@Data
@TableName("mf_mail_remote")
public class MailRemoteEntity {
    private Long userId;
    private Long accountId;
    private Long mailId;
    private String remoteFolder;
    private Long uidValidity;
    private Long remoteUid;
}
