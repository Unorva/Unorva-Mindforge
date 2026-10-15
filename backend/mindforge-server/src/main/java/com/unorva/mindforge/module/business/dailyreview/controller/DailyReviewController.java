package com.unorva.mindforge.module.business.dailyreview.controller;

import com.unorva.mindforge.common.security.support.CurrentUser;
import com.unorva.mindforge.common.web.vo.Result;
import com.unorva.mindforge.module.business.dailyreview.domain.form.DailyReviewUpdateForm;
import com.unorva.mindforge.module.business.dailyreview.domain.vo.DailyReviewReportVO;
import com.unorva.mindforge.module.business.dailyreview.service.DailyReviewService;

import jakarta.validation.Valid;

import lombok.RequiredArgsConstructor;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;

/**
 * 每日复盘控制类
 *
 * @author yanshijie
 */
@RestController
@RequiredArgsConstructor
public class DailyReviewController {

    /** 每日复盘服务 */
    private final DailyReviewService dailyReviewService;

    /**
     * 获取当前日期复盘笔记
     *
     * @param date 当前日期
     * @return 复盘笔记
     */
    @GetMapping("/daily-reviews")
    public Result<String> getDailyReview(@RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return Result.success(dailyReviewService.getDailyReviewContent(CurrentUser.id(), date));
    }

    /**
     * 更新当前日期复盘笔记
     *
     * @param param 复盘笔记参数
     * @return 更新结果
     */
    @PutMapping("/daily-reviews")
    public Result<Void> updateDailyReview(@RequestBody @Valid DailyReviewUpdateForm param) {
        dailyReviewService.updateDailyReview(CurrentUser.id(), param.date(), param.content());
        return Result.success();
    }

    /**
     * 获取当前月份有笔记的日期列表
     *
     * @param month 当前月份
     * @return 复盘笔记日期列表
     */
    @GetMapping("/daily-reviews/calendar")
    public Result<List<LocalDate>> getDailyReviewCalendar(
            @RequestParam @DateTimeFormat(pattern = "yyyy-MM") YearMonth month) {
        return Result.success(dailyReviewService.getDailyReviewCalendar(CurrentUser.id(), month));
    }

    @GetMapping("/daily-reviews/report")
    public Result<DailyReviewReportVO> getDailyReviewReport(
            @RequestParam String type, @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return Result.success(dailyReviewService.getDailyReviewReport(CurrentUser.id(), type, date));
    }

    /**
     * 删除当前日期复盘笔记
     *
     * @param date 当前日期
     * @return 删除结果
     */
    @DeleteMapping("/daily-reviews/{date}")
    public Result<Void> deleteDailyReview(
            @PathVariable("date") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        dailyReviewService.deleteDailyReview(CurrentUser.id(), date);
        return Result.success();
    }
}
