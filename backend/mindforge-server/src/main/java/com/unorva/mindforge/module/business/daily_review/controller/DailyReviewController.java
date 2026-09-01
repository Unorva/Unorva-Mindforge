package com.unorva.mindforge.module.business.daily_review.controller;

import com.unorva.mindforge.common.web.vo.Result;
import com.unorva.mindforge.module.business.daily_review.domain.param.DailyReviewUpdateParam;
import com.unorva.mindforge.module.business.daily_review.service.DailyReviewService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;

/**
 * 每日复盘控制类
 *
 * @Author yanshijie
 * @Date 2026/9/1 09:31
 */
@RestController
@RequestMapping("/daily-reviews")
@RequiredArgsConstructor
public class DailyReviewController {

    /**
     * 每日复盘服务
     */
    private final DailyReviewService dailyReviewService;

    /**
     * 获取当前日期复盘笔记
     * @param date 当前日期
     * @return 复盘笔记
     */
    @GetMapping
    public Result<String> getDailyReview(@RequestParam LocalDate date) {
        return Result.success(dailyReviewService.getDailyReviewContent(date));
    }

    /**
     * 更新当前日期复盘笔记
     * @param param 复盘笔记参数
     * @return 更新结果
     */
    @PutMapping
    public Result<Void> updateDailyReview(@RequestBody @Valid DailyReviewUpdateParam param) {
        dailyReviewService.updateDailyReview(param.date(), param.content());
        return Result.success();
    }

    /**
     * 获取当前月份有笔记的日期列表
     * @param month 当前月份
     * @return 复盘笔记日期列表
     */
    @GetMapping("/calendar")
    public Result<List<LocalDate>> getDailyReviewCalendar(@RequestParam @DateTimeFormat(pattern = "yyyy-MM") YearMonth month) {
        return Result.success(dailyReviewService.getDailyReviewCalendar(month));
    }

    /**
     * 删除当前日期复盘笔记
     * @param date 当前日期
     * @return 删除结果
     */
    @DeleteMapping("/{date}")
    public Result<Void> deleteDailyReview(@PathVariable("date") LocalDate date) {
        dailyReviewService.deleteDailyReview(date);
        return Result.success();
    }

}
