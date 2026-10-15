package com.unorva.mindforge.module.business.notes.domain.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;

import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("mf_note_folder")
public class NoteFolderEntity {
    @TableId(type = IdType.INPUT)
    private String id;

    private Long userId;
    private String name;
    private String parentId;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
