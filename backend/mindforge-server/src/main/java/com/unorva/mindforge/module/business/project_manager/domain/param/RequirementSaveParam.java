package com.unorva.mindforge.module.business.project_manager.domain.param;

import jakarta.validation.constraints.NotBlank;

import java.time.LocalDate;

public record RequirementSaveParam(
        @NotBlank(message = "需求标题不能为空") String title,
        String description,
        @NotBlank(message = "需求优先级不能为空") String priority,
        @NotBlank(message = "需求状态不能为空") String status,
        LocalDate dueDate
) {
}
