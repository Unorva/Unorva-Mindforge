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

    private Long projectId;

    private Long requirementId;

    private String title;

    private String description;

    private String reproductionSteps;

    private String severity;

    private String priority;

    private String status;

    private Long ownerId;

    private LocalDate dueDate;

}
