package com.unorva.mindforge.module.business.dailyreview.service;


import com.unorva.mindforge.common.exception.BusinessException;
import com.unorva.mindforge.common.exception.RepositoryErrorCode;
import com.unorva.mindforge.module.business.dailyreview.domain.entity.DailyReviewEntity;
import com.unorva.mindforge.module.business.dailyreview.domain.vo.DailyReviewReportVO;
import com.unorva.mindforge.module.business.dailyreview.dao.DailyReviewDao;

import lombok.RequiredArgsConstructor;

import org.springframework.stereotype.Service;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.temporal.TemporalAdjusters;
import java.util.List;
import java.util.Map;

/**
 * 每日复盘服务类
 *
 * @author yanshijie
 */
@Service
@RequiredArgsConstructor
public class DailyReviewService {

    private static final int MAX_CONTENT_LENGTH = 1000000;
    private static final Map<String, DayOfWeek> WEEK_START_DAYS =
            Map.of(
                    "星期一", DayOfWeek.MONDAY,
                    "星期二", DayOfWeek.TUESDAY,
                    "星期三", DayOfWeek.WEDNESDAY,
                    "星期四", DayOfWeek.THURSDAY,
                    "星期五", DayOfWeek.FRIDAY,
                    "星期六", DayOfWeek.SATURDAY,
                    "星期日", DayOfWeek.SUNDAY);

    private final DailyReviewDao dailyReviewDao;

    /**
     * 获取每日复盘内容
     *
     * @param date 日期
     * @return 复盘内容
     */
    public String getDailyReviewContent(long userId, LocalDate date) {
        validateDate(date);
        // 1. 获取当前日期的复盘笔记内容
        DailyReviewEntity dailyReview = getDailyReview(userId, date);
        return dailyReview == null ? "" : dailyReview.getContent();
    }

    /**
     * 更新每日复盘
     *
     * @param date 日期
     * @param content 内容
     */
    public void updateDailyReview(long userId, LocalDate date, String content) {
        validateDate(date);
        if (content == null || content.length() > MAX_CONTENT_LENGTH) {
            throw new BusinessException("复盘内容不能为空且不能超过1000000个字符", RepositoryErrorCode.UPDATE_FAILED);
        }
        String reviewContent = content.isBlank() ? "" : content;
        if (dailyReviewDao.upsertContent(userId, date, reviewContent) < 1) {
            throw new BusinessException(RepositoryErrorCode.INSERT_OR_UPDATE_FAILED);
        }
    }

    /**
     * 获取每日复盘日历
     *
     * @param month 当前月份
     * @return 复盘日历
     */
    public List<LocalDate> getDailyReviewCalendar(long userId, YearMonth month) {
        if (month == null || month.getYear() < 1000 || month.getYear() > 9999) {
            throw new BusinessException("月份必须在1000年至9999年之间", RepositoryErrorCode.UPDATE_FAILED);
        }
        LocalDate startDate = month.atDay(1);
        LocalDate endDate = month.atEndOfMonth();
        return dailyReviewDao.selectCalendar(userId, startDate, endDate);
    }

    /**
     * 获取当前用户在周、月或年内实际保存的复盘，按日期升序返回。
     *
     * @param type weekly、monthly或yearly
     * @param date 日期范围中的任意一天
     * @return 复盘报告
     */
    public DailyReviewReportVO getDailyReviewReport(long userId, String type, LocalDate date) {
        validateDate(date);
        LocalDate startDate;
        LocalDate endDate;
        if ("weekly".equals(type)) {
            String configuredWeekStart = dailyReviewDao.selectWeekStartsOn(userId);
            DayOfWeek weekStart =
                    configuredWeekStart == null
                            ? DayOfWeek.MONDAY
                            : WEEK_START_DAYS.getOrDefault(configuredWeekStart, DayOfWeek.MONDAY);
            startDate = date.with(TemporalAdjusters.previousOrSame(weekStart));
            endDate = startDate.plusDays(6);
            startDate = startDate.isBefore(LocalDate.of(1000, 1, 1)) ? LocalDate.of(1000, 1, 1) : startDate;
            endDate = endDate.isAfter(LocalDate.of(9999, 12, 31)) ? LocalDate.of(9999, 12, 31) : endDate;
        } else if ("monthly".equals(type)) {
            startDate = date.withDayOfMonth(1);
            endDate = YearMonth.from(date).atEndOfMonth();
        } else if ("yearly".equals(type)) {
            startDate = date.withDayOfYear(1);
            endDate = LocalDate.of(date.getYear(), 12, 31);
        } else {
            throw new BusinessException("报告类型必须为weekly、monthly或yearly", RepositoryErrorCode.UPDATE_FAILED);
        }
        List<DailyReviewReportVO.EntryVO> entries =
                dailyReviewDao.selectEntries(userId, startDate, endDate).stream()
                        .filter(review -> !review.getContent().isBlank())
                        .map(review -> new DailyReviewReportVO.EntryVO(review.getReviewDate(), review.getContent()))
                        .toList();
        return new DailyReviewReportVO(startDate, endDate, entries);
    }

    /**
     * 删除每日复盘
     *
     * @param date 当前日期
     */
    public void deleteDailyReview(long userId, LocalDate date) {
        validateDate(date);
        dailyReviewDao.deleteContent(userId, date);
    }

    /**
     * 根据日期获取当前用户的复盘笔记对象
     *
     * @param date 当前日期
     * @return 复盘笔记对象
     */
    private DailyReviewEntity getDailyReview(long userId, LocalDate date) {
        return dailyReviewDao.selectByDate(userId, date);
    }

    private void validateDate(LocalDate date) {
        if (date == null || date.getYear() < 1000 || date.getYear() > 9999) {
            throw new BusinessException("日期必须在1000年至9999年之间", RepositoryErrorCode.UPDATE_FAILED);
        }
    }
}
