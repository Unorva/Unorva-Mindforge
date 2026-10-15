package com.unorva.mindforge.module.business.dashboard.domain.bo;
import java.time.LocalDate;
/** Internal aggregation parameters; business constants stay outside SQL. */
public record DashboardQueryBO(Long userId, LocalDate monthStart, LocalDate nextMonth,
        String activeProjectStatus, String closedDefectStatus, String inboxFolder,
        String incomeType, String expenseType) {}
