package com.unorva.mindforge.module.business.daily_review.domain.param;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;

/**
 * @Author yanshijie
 * @Date 2026/9/1 14:16
 */
@Schema(name = "DailyReviewUpdateParam", description = "每日复盘更新请求")
public record DailyReviewUpdateParam(

        @Schema(description = "日期", example = "2023-01-01", requiredMode = Schema.RequiredMode.REQUIRED)
        @NotNull(message = "日期不能为空")
        LocalDate date,

        @NotBlank(message = "内容不能为空")
        @Schema(description = "内容", example = "今天学习了...", requiredMode = Schema.RequiredMode.REQUIRED)
        String content
) {
}
