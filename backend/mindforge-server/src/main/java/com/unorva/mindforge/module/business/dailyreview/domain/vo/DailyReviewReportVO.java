package com.unorva.mindforge.module.business.dailyreview.domain.vo;

import java.time.LocalDate;
import java.util.List;

/** 周、月、年复盘的日期范围和原始记录。 */
public record DailyReviewReportVO(LocalDate startDate, LocalDate endDate, List<EntryVO> entries) {

    public record EntryVO(LocalDate date, String content) {}
}
