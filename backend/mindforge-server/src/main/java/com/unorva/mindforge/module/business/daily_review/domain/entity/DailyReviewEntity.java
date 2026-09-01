package com.unorva.mindforge.module.business.daily_review.domain.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import com.unorva.mindforge.common.datasource.domain.BaseEntity;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.time.LocalDate;

/**
 * 每日复盘实体类
 *
 * @Author yanshijie
 * @Date 2026/9/1 09:33
 */
@EqualsAndHashCode(callSuper = true)
@Data
@TableName("daily_review")
public class DailyReviewEntity extends BaseEntity {

    /**
     * 用户ID
     */
    private Long userId;

    /**
     * 复盘日期
     */
    private LocalDate reviewDate;

    /**
     * 复盘内容
     */
    private String content;

}
