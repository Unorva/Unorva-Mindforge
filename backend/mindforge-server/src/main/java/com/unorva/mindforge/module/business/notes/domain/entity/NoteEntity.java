package com.unorva.mindforge.module.business.notes.domain.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;

import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("mf_note")
public class NoteEntity {
    @TableId(type = IdType.AUTO)
    private Long id;

    private Long userId;
    private String folderId;
    private String title;
    private String content;
    private String color;
    private Boolean deleted;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
