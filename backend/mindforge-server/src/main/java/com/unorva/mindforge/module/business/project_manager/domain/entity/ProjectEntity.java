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

    /**
     * 用户ID
     */
    private Long userId;

    /**
     * 项目名称
     */
    private String name;

    /**
     * 项目描述
     */
    private String description;

    /**
     * 项目状态
     */
    private String status;

    /**
     * 项目所有者ID
     */
    private Long ownerId;

    /**
     * 开始日期
     */
    private LocalDate startDate;

    /**
     * 结束日期
     */
    private LocalDate endDate;

}
