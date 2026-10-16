package com.unorva.mindforge.module.system.settings.domain.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;

import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("mf_user_setting")
public class UserSettingEntity {
    @TableId(value = "user_id", type = IdType.INPUT)
    private Long userId;

    private String aiJson;
    private String appsJson;
    private String notificationsJson;
    private String reportsJson;
    private String securityJson;
    private String appearanceJson;
    private LocalDateTime updatedAt;
}
