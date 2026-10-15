package com.unorva.mindforge.module.business.mail.domain.entity;

import com.baomidou.mybatisplus.annotation.*;

import lombok.Data;

import java.time.LocalDateTime;

/** Persistent owner-scoped mf_mail row. */
@Data
@TableName("mf_mail")
public class MailEntity {
    @TableId(type = IdType.AUTO)
    private Long id;

    private Long userId;
    private Long accountId;
    private String sender;
    private String recipient;
    private String subject;
    private String body;
    private String folder;
    private Boolean starred;
    private Boolean unread;
    private Long flagsVersion;
    private String sendAttemptToken;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
