package com.unorva.mindforge.module.business.project_manager.domain.param;

import jakarta.validation.constraints.NotBlank;

import java.time.LocalDate;

public record ProjectSaveParam(
        @NotBlank(message = "项目名称不能为空") String name,
        String description,
        @NotBlank(message = "项目状态不能为空") String status,
        LocalDate startDate,
        LocalDate endDate
) {
}
