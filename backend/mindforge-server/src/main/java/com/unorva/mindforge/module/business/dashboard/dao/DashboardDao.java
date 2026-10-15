package com.unorva.mindforge.module.business.dashboard.dao;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.unorva.mindforge.module.business.projectmanager.domain.entity.ProjectEntity;
import com.unorva.mindforge.module.business.dashboard.domain.bo.DashboardMetricsBO;
import com.unorva.mindforge.module.business.dashboard.domain.bo.DashboardQueryBO;
import com.unorva.mindforge.module.business.dashboard.domain.vo.DashboardVO.RecentProjectVO;
import com.unorva.mindforge.module.business.dashboard.domain.vo.DashboardVO.RecentReviewVO;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import java.util.List;
/** Read-only projection of existing business tables. */
@Mapper
public interface DashboardDao extends BaseMapper<ProjectEntity> {
    DashboardMetricsBO selectMetrics(@Param("query") DashboardQueryBO query);
    List<RecentProjectVO> selectRecentProjects(@Param("userId") long userId);
    List<RecentReviewVO> selectRecentReviews(@Param("userId") long userId);
}
