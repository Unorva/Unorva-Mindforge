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

    private Long projectId;

    private String title;

    private String description;

    private String priority;

    private String status;

    private Long ownerId;

    private LocalDate dueDate;
}
