package com.unorva.mindforge.module.business.project_manager.domain.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import com.unorva.mindforge.common.datasource.domain.BaseEntity;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.time.LocalDate;

@Data
@EqualsAndHashCode(callSuper = true)
@TableName("project")
public class ProjectEntity extends BaseEntity {

    private Long userId;

    private String name;

    private String description;

    private String status;

    private Long ownerId;

    private LocalDate startDate;

    private LocalDate endDate;

}
