package com.unorva.mindforge.module.business.projectmanager.domain.form;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

public record RequirementSaveForm(
        @NotBlank(message = "需求标题不能为空") @Size(max = 300, message = "需求标题不能超过300个字符") String title,
        @Size(max = 10000, message = "需求描述不能超过10000个字符") String description,
        @NotBlank(message = "需求优先级不能为空") String priority,
        @NotBlank(message = "需求状态不能为空") String status,
        LocalDate dueDate,
        @PositiveOrZero(message = "版本号不能为负数") Integer version) {
    public RequirementSaveForm(String title, String description, String priority, String status, LocalDate dueDate) {
        this(title, description, priority, status, dueDate, null);
    }
}
