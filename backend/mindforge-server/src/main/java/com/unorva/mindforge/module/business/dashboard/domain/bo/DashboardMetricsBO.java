package com.unorva.mindforge.module.business.dashboard.domain.bo;
import java.math.BigDecimal;
/** Persisted counts and amounts, independent from the HTTP response. */
public record DashboardMetricsBO(Long projects, Long activeProjects, Long requirements, Long defects,
        Long notes, Long blogs, Long reviews, Long conversations, Long unread,
        BigDecimal assets, BigDecimal income, BigDecimal expense) {}
