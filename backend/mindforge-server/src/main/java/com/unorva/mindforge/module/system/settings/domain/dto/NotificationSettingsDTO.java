package com.unorva.mindforge.module.system.settings.domain.dto;

public record NotificationSettingsDTO(
        boolean emailNotifications,
        boolean inAppNotifications,
        boolean dailyReviewReminder,
        boolean projectUpdates,
        boolean aiWeeklyReport) {}
