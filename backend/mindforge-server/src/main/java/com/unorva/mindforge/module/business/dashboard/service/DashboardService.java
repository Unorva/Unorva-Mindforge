package com.unorva.mindforge.module.business.dashboard.service;
import com.unorva.mindforge.module.business.dashboard.dao.DashboardDao;
import com.unorva.mindforge.module.business.dashboard.domain.bo.DashboardMetricsBO;
import com.unorva.mindforge.module.business.dashboard.domain.bo.DashboardQueryBO;
import com.unorva.mindforge.module.business.dashboard.domain.vo.DashboardVO;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDate;
import java.time.ZoneId;
/** Assembles a consistent read-only overview from real persisted data. */
@Service
@RequiredArgsConstructor
public class DashboardService {
    private static final ZoneId REPORT_ZONE = ZoneId.of("Asia/Shanghai");
    private final DashboardDao dashboardDao;
    @Transactional(readOnly = true)
    public DashboardVO summary(long userId) {
        LocalDate monthStart = LocalDate.now(REPORT_ZONE).withDayOfMonth(1);
        DashboardMetricsBO metrics = dashboardDao.selectMetrics(new DashboardQueryBO(userId, monthStart,
                monthStart.plusMonths(1), "进行中", "已关闭", "inbox", "收入", "支出"));
        return new DashboardVO(metrics.projects(), metrics.activeProjects(), metrics.requirements(),
                metrics.defects(), metrics.notes(), metrics.blogs(), metrics.reviews(), metrics.conversations(),
                metrics.unread(), metrics.assets(), metrics.income(), metrics.expense(),
                dashboardDao.selectRecentProjects(userId), dashboardDao.selectRecentReviews(userId));
    }
}
