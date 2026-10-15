package com.unorva.mindforge.module.business.dailyreview.domain.form;

import io.swagger.v3.oas.annotations.media.Schema;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

/**
 * @author yanshijie
 */
@Schema(name = "DailyReviewUpdateForm", description = "每日复盘更新请求")
public record DailyReviewUpdateForm(
        @Schema(description = "日期", example = "2023-01-01", requiredMode = Schema.RequiredMode.REQUIRED)
                @NotNull(message = "日期不能为空")
                LocalDate date,
        @Schema(description = "内容", example = "今天学习了...", requiredMode = Schema.RequiredMode.REQUIRED)
                @NotNull(message = "复盘内容不能为空")
                @Size(max = 1000000, message = "复盘内容不能超过1000000个字符")
                String content) {}
