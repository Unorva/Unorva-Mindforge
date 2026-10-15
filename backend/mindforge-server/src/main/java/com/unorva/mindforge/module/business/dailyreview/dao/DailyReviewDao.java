package com.unorva.mindforge.module.business.dailyreview.dao;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.unorva.mindforge.module.business.dailyreview.domain.entity.DailyReviewEntity;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import java.time.LocalDate;
import java.util.List;
/** Atomic daily review persistence; every query is scoped to an explicit user. */
@Mapper
public interface DailyReviewDao extends BaseMapper<DailyReviewEntity> {
    String selectWeekStartsOn(@Param("userId") long userId);
    DailyReviewEntity selectByDate(@Param("userId") long userId, @Param("date") LocalDate date);
    List<LocalDate> selectCalendar(@Param("userId") long userId, @Param("start") LocalDate start, @Param("end") LocalDate end);
    List<DailyReviewEntity> selectEntries(@Param("userId") long userId, @Param("start") LocalDate start, @Param("end") LocalDate end);
    int upsertContent(@Param("userId") long userId, @Param("date") LocalDate date, @Param("content") String content);
    int deleteContent(@Param("userId") long userId, @Param("date") LocalDate date);
}
