package com.unorva.mindforge.module.system.settings.domain.form;

public record NotificationSettingsForm(
        boolean emailNotifications,
        boolean inAppNotifications,
        boolean dailyReviewReminder,
        boolean projectUpdates,
        boolean aiWeeklyReport) {}
