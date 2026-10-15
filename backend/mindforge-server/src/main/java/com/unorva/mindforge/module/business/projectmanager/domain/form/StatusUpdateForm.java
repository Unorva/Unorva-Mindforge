package com.unorva.mindforge.module.business.projectmanager.domain.form;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.PositiveOrZero;

public record StatusUpdateForm(
        @NotBlank(message = "状态不能为空") String status, @PositiveOrZero(message = "版本号不能为负数") Integer version) {}
