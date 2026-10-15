package com.unorva.mindforge.module.business.projectmanager.domain.form;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

public record DefectSaveForm(
        @NotBlank(message = "缺陷标题不能为空") @Size(max = 300, message = "缺陷标题不能超过300个字符") String title,
        @Size(max = 10000, message = "缺陷描述不能超过10000个字符") String description,
        @Size(max = 10000, message = "复现步骤不能超过10000个字符") String reproductionSteps,
        @Positive(message = "关联需求ID必须为正数") Long requirementId,
        @NotBlank(message = "缺陷严重程度不能为空") String severity,
        @NotBlank(message = "缺陷优先级不能为空") String priority,
        @NotBlank(message = "缺陷状态不能为空") String status,
        LocalDate dueDate,
        @PositiveOrZero(message = "版本号不能为负数") Integer version) {
    public DefectSaveForm(
            String title,
            String description,
            String reproductionSteps,
            Long requirementId,
            String severity,
            String priority,
            String status,
            LocalDate dueDate) {
        this(title, description, reproductionSteps, requirementId, severity, priority, status, dueDate, null);
    }
}
