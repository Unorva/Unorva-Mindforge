package com.unorva.mindforge.module.system.settings.domain.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;

import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("mf_email_binding")
public class EmailBindingEntity {
    @TableId(value = "id", type = IdType.AUTO)
    private Long id;

    private Long userId;
    private String email;
    private String provider;
    private Boolean isPrimary;
    private Boolean verified;
    private LocalDateTime boundAt;
}
