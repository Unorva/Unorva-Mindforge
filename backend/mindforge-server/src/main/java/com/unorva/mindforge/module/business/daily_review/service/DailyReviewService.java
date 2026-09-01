package com.unorva.mindforge.module.business.daily_review.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.unorva.mindforge.common.exception.BusinessException;
import com.unorva.mindforge.common.exception.RepositoryErrorCode;
import com.unorva.mindforge.common.security.utils.SecurityUtil;
import com.unorva.mindforge.module.business.daily_review.domain.entity.DailyReviewEntity;
import com.unorva.mindforge.module.business.daily_review.manager.DailyReviewManager;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;

/**
 * 每日复盘服务类
 *
 * @Author yanshijie
 * @Date 2026/9/1 09:32
 */
@Service
@RequiredArgsConstructor
public class DailyReviewService {

    /**
     * 每日复盘Manager层
     */
    private final DailyReviewManager dailyReviewManager;

    /**
     * 获取每日复盘内容
     * @param date 日期
     * @return 复盘内容
     */
    public String getDailyReviewContent(LocalDate date) {
        // 1. 获取当前日期的复盘笔记内容
        return getDailyReview(date).getContent();
    }

    /**
     * 更新每日复盘
     * @param date 日期
     * @param content 内容
     */
    public void updateDailyReview(LocalDate date, String content) {
        // 1. 查询当前日期是否存在
        DailyReviewEntity dailyReview = getDailyReview(date);
        if (dailyReview == null) {
            dailyReview = new DailyReviewEntity();
            dailyReview.setReviewDate(date);
            dailyReview.setUserId(SecurityUtil.getUserId());
        }
        // 2. 插入或更新复盘
        dailyReview.setContent(content);
        if (dailyReviewManager.saveOrUpdate(dailyReview)) {
            throw new BusinessException(RepositoryErrorCode.INSERT_OR_UPDATE_FAILED);
        }
    }

    /**
     * 获取每日复盘日历
     * @param month 当前月份
     * @return 复盘日历
     */
    public List<LocalDate> getDailyReviewCalendar(YearMonth month) {
        LocalDate startDate = month.atDay(1);
        LocalDate endDate = month.atEndOfMonth();
        return dailyReviewManager.list(
                        new LambdaQueryWrapper<DailyReviewEntity>()
                                .select(DailyReviewEntity::getReviewDate)
                                .eq(DailyReviewEntity::getUserId, SecurityUtil.getUserId())
                                .between(DailyReviewEntity::getReviewDate, startDate, endDate)
                                .isNotNull(DailyReviewEntity::getContent)
                                .apply("TRIM(content) <> ''")
                                .orderByAsc(DailyReviewEntity::getReviewDate)
                ).stream()
                .map(DailyReviewEntity::getReviewDate)
                .toList();
    }

    /**
     * 删除每日复盘
     * @param date 当前日期
     */
    public void deleteDailyReview(LocalDate date) {
        if (!dailyReviewManager.remove(
                new LambdaQueryWrapper<DailyReviewEntity>()
                        .eq(DailyReviewEntity::getReviewDate, date)
                        .eq(DailyReviewEntity::getUserId, SecurityUtil.getUserId())
        )) {
            throw new BusinessException(RepositoryErrorCode.DELETE_FAILED);
        }
    }

    /**
     * 根据日期获取当前用户的复盘笔记对象
     * @param date 当前日期
     * @return 复盘笔记对象
     */
    private DailyReviewEntity getDailyReview(LocalDate date) {
        return dailyReviewManager.getOne(
                new LambdaQueryWrapper<DailyReviewEntity>()
                        .eq(DailyReviewEntity::getReviewDate, date)
                        .eq(DailyReviewEntity::getUserId, SecurityUtil.getUserId())
        );
    }
}
