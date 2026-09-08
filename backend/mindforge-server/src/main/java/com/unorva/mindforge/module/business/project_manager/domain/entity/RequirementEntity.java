package com.unorva.mindforge.module.business.project_manager.domain.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import com.unorva.mindforge.common.datasource.domain.BaseEntity;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.time.LocalDate;

@Data
@EqualsAndHashCode(callSuper = true)
@TableName("project_requirement")
public class RequirementEntity extends BaseEntity {

    /**
     * 项目ID
     */
    private Long projectId;

    /**
     * 需求标题
     */
    private String title;

    /**
     * 需求描述
     */
    private String description;

    /**
     * 需求优先级
     */
    private String priority;

    /**
     * 需求状态
     */
    private String status;

    /**
     * 需求所有者ID
     */
    private Long ownerId;

    /**
     * 截止日期
     */
    private LocalDate dueDate;
}
