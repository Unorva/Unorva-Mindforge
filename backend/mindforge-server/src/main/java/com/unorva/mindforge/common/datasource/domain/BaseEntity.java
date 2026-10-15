package com.unorva.mindforge.common.datasource.domain;

import com.baomidou.mybatisplus.annotation.FieldFill;
import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableLogic;
import com.baomidou.mybatisplus.annotation.Version;

import lombok.Data;

import java.io.Serial;
import java.io.Serializable;
import java.time.LocalDateTime;

/** 数据库实体基类 @Author yanshijie @Date 2026/8/25 23:26 */
@Data
public class BaseEntity implements Serializable {

    @Serial private static final long serialVersionUID = 1L;

    @TableId(type = IdType.AUTO)
    private Long id;

    @TableLogic
    @TableField(fill = FieldFill.INSERT)
    private Integer deleted;

    @Version
    @TableField(fill = FieldFill.INSERT)
    private Integer version;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdTime;

    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updatedTime;
}
