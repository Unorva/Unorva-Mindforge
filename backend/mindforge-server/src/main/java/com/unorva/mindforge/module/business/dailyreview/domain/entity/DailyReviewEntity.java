package com.unorva.mindforge.module.business.dailyreview.domain.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import com.unorva.mindforge.common.datasource.domain.BaseEntity;

import lombok.Data;
import lombok.EqualsAndHashCode;

import java.io.Serial;
import java.time.LocalDate;

/**
 * 每日复盘实体类
 *
 * @author yanshijie
 */
@EqualsAndHashCode(callSuper = true)
@Data
@TableName("daily_review")
public class DailyReviewEntity extends BaseEntity {

    @Serial private static final long serialVersionUID = 1L;

    /** 用户ID */
    private Long userId;

    /** 复盘日期 */
    private LocalDate reviewDate;

    /** 复盘内容 */
    private String content;
}
