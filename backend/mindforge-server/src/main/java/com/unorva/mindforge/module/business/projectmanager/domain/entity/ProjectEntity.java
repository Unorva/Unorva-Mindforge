package com.unorva.mindforge.module.business.projectmanager.domain.entity;

import com.baomidou.mybatisplus.annotation.FieldStrategy;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableName;
import com.unorva.mindforge.common.datasource.domain.BaseEntity;

import lombok.Data;
import lombok.EqualsAndHashCode;

import java.io.Serial;
import java.time.LocalDate;

@Data
@EqualsAndHashCode(callSuper = true)
@TableName("project")
public class ProjectEntity extends BaseEntity {

    @Serial private static final long serialVersionUID = 1L;

    /** 用户ID */
    private Long userId;

    /** 项目名称 */
    private String name;

    /** 项目描述 */
    @TableField(updateStrategy = FieldStrategy.ALWAYS)
    private String description;

    /** 项目状态 */
    private String status;

    /** 项目所有者ID */
    private Long ownerId;

    /** 开始日期 */
    @TableField(updateStrategy = FieldStrategy.ALWAYS)
    private LocalDate startDate;

    /** 结束日期 */
    @TableField(updateStrategy = FieldStrategy.ALWAYS)
    private LocalDate endDate;
}
