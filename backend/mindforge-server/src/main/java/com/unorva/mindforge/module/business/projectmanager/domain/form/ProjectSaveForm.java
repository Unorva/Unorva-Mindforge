package com.unorva.mindforge.module.business.projectmanager.domain.form;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

public record ProjectSaveForm(
        @NotBlank(message = "项目名称不能为空") @Size(max = 200, message = "项目名称不能超过200个字符") String name,
        @Size(max = 10000, message = "项目描述不能超过10000个字符") String description,
        @NotBlank(message = "项目状态不能为空") String status,
        LocalDate startDate,
        LocalDate endDate,
        @PositiveOrZero(message = "版本号不能为负数") Integer version) {
    public ProjectSaveForm(String name, String description, String status, LocalDate startDate, LocalDate endDate) {
        this(name, description, status, startDate, endDate, null);
    }
}
