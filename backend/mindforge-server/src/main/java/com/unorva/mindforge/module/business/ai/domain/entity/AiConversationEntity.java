package com.unorva.mindforge.module.business.ai.domain.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;

import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("mf_ai_conversation")
public class AiConversationEntity {
    @TableId(value = "id", type = IdType.AUTO)
    private Long id;

    private Long userId;
    private String title;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
