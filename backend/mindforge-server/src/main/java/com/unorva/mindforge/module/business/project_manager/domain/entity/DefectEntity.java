package com.unorva.mindforge.module.business.project_manager.domain.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import com.unorva.mindforge.common.datasource.domain.BaseEntity;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.time.LocalDate;

@Data
@EqualsAndHashCode(callSuper = true)
@TableName("project_defect")
public class DefectEntity extends BaseEntity {

    /**
     * 项目ID
     */
    private Long projectId;

    /**
     * 需求ID
     */
    private Long requirementId;

    /**
     * 缺陷标题
     */
    private String title;

    /**
     * 缺陷描述
     */
    private String description;

    /**
     * 复现步骤
     */
    private String reproductionSteps;

    /**
     * 严重程度
     */
    private String severity;

    /**
     * 优先级
     */
    private String priority;

    /**
     * 状态
     */
    private String status;

    /**
     * 所有者ID
     */
    private Long ownerId;

    /**
     * 截止日期
     */
    private LocalDate dueDate;

}
