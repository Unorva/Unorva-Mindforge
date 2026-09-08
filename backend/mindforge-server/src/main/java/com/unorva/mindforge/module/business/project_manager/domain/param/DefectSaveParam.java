package com.unorva.mindforge.module.business.project_manager.domain.param;

import jakarta.validation.constraints.NotBlank;

import java.time.LocalDate;

public record DefectSaveParam(
        @NotBlank(message = "缺陷标题不能为空") String title,
        String description,
        String reproductionSteps,
        Long requirementId,
        @NotBlank(message = "缺陷严重程度不能为空") String severity,
        @NotBlank(message = "缺陷优先级不能为空") String priority,
        @NotBlank(message = "缺陷状态不能为空") String status,
        LocalDate dueDate
) {
}
