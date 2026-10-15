package com.unorva.mindforge.module.business.ai.domain.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;

import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("mf_user_setting")
public class AiPreferenceEntity {
    @TableId(value = "user_id", type = IdType.INPUT)
    private Long userId;

    private String aiJson;
    private LocalDateTime updatedAt;
}
