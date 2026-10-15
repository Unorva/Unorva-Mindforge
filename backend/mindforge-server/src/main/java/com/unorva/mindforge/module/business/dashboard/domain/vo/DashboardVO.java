package com.unorva.mindforge.module.business.dashboard.domain.vo;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/** Personal workspace aggregates, all restricted to the authenticated user. */
public record DashboardVO(
        long projectCount,
        long activeProjectCount,
        long requirementCount,
        long openDefectCount,
        long noteCount,
        long blogCount,
        long reviewCount,
        long conversationCount,
        long unreadMailCount,
        BigDecimal totalAssets,
        BigDecimal monthIncome,
        BigDecimal monthExpense,
        List<RecentProjectVO> recentProjects,
        List<RecentReviewVO> recentReviews) {

    /** A recently updated project. */
    public record RecentProjectVO(long id, String name, String status, LocalDateTime updatedTime) {}

    /** A recently saved review, with a short plain text preview. */
    public record RecentReviewVO(long id, LocalDate date, String preview) {}
}
