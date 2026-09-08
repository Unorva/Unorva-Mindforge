package com.unorva.mindforge.module.business.project_manager.domain.param;

import jakarta.validation.constraints.NotBlank;

public record StatusUpdateParam(
        @NotBlank(message = "状态不能为空") String status
) {
}
