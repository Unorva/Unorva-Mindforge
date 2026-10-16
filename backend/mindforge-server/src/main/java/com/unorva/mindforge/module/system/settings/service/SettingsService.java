package com.unorva.mindforge.module.system.settings.service;

import com.unorva.mindforge.common.exception.BusinessErrorCode;
import com.unorva.mindforge.common.exception.BusinessException;
import com.unorva.mindforge.module.business.ai.domain.form.AiSaveForm;
import com.unorva.mindforge.module.business.ai.service.AiSettingsService;
import com.unorva.mindforge.module.system.settings.domain.dto.*;
import com.unorva.mindforge.module.system.settings.domain.form.*;
import com.unorva.mindforge.module.system.settings.domain.vo.ActiveSessionVO;
import com.unorva.mindforge.module.system.settings.domain.vo.SettingsVO;
import com.unorva.mindforge.module.system.settings.manager.SettingsManager;
import com.unorva.mindforge.module.system.settings.manager.SettingsSessionManager;

import lombok.RequiredArgsConstructor;

import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.node.ObjectNode;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

/** Business validation and aggregation for the account settings page. */
@Service
@RequiredArgsConstructor
public class SettingsService {
    private final SettingsManager settingsManager;
    private final AiSettingsService aiSettingsService;
    private final SettingsSessionManager sessions;
    private final ObjectMapper objectMapper;

    public SettingsVO get(long userId) {
        return snapshot(userId);
    }

    public SettingsVO saveAi(long userId, AiSaveForm form) {
        aiSettingsService.save(userId, form);
        return snapshot(userId);
    }

    public SettingsVO removeCredential(long userId) {
        aiSettingsService.removeCredential(userId);
        return snapshot(userId);
    }

    public SettingsVO saveApps(long userId, List<AppIntegrationForm> apps) {
        if (apps.size() > 20 || apps.stream().map(AppIntegrationForm::id).distinct().count() != apps.size())
            throw new BusinessException("应用配置数量超限或包含重复标识", BusinessErrorCode.INVALID_INPUT);
        List<AppIntegrationDTO> preferences =
                apps.stream()
                        .map(
                                form ->
                                        new AppIntegrationDTO(
                                                form.id(),
                                                form.name(),
                                                form.description(),
                                                form.enabled(),
                                                new AppOptionsDTO(
                                                        form.options().syncFrequency(),
                                                        form.options().notifyEnabled(),
                                                        form.options().aiAssist())))
                        .toList();
        return updatePreferences(userId, "apps_json", preferences);
    }

    public SettingsVO saveNotifications(long userId, NotificationSettingsForm form) {
        return updatePreferences(
                userId,
                "notifications_json",
                new NotificationSettingsDTO(
                        form.emailNotifications(),
                        form.inAppNotifications(),
                        form.dailyReviewReminder(),
                        form.projectUpdates(),
                        form.aiWeeklyReport()));
    }

    public SettingsVO saveReports(long userId, ReportSettingsForm form) {
        return updatePreferences(userId, "reports_json", new ReportSettingsDTO(form.weekStartsOn()));
    }

    public SettingsVO saveAppearance(long userId, AppearanceSettingsForm form) {
        if (form.background() == null || !Set.of("plain", "dots", "watermark").contains(form.background())) {
            throw new BusinessException("请选择有效的背景样式", BusinessErrorCode.INVALID_INPUT);
        }
        return updatePreferences(userId, "appearance_json", new AppearanceSettingsDTO(form.background()));
    }

    public SettingsVO saveSecurity(long userId, String token, SecuritySettingsForm form) {
        if (form.twoFactor()) throw new BusinessException("双重验证尚未配置，不能仅通过设置开关启用", BusinessErrorCode.NOT_CONFIGURED);
        Long timeout =
                Map.of("30 分钟", 1800L, "2 小时", 7200L, "8 小时", 28800L, "24 小时", 86400L).get(form.sessionTimeout());
        if (timeout == null) throw new BusinessException(BusinessErrorCode.INVALID_INPUT);
        sessions.renew(token, timeout);
        return updatePreferences(
                userId,
                "security_json",
                new SecuritySettingsDTO(false, form.loginAlerts(), form.sessionTimeout(), List.of()));
    }

    public SettingsVO bindEmail(long userId, EmailBindForm form) {
        settingsManager.bindEmail(userId, form.email().trim().toLowerCase(Locale.ROOT), form.provider().trim());
        return snapshot(userId);
    }

    public SettingsVO verifyEmail(long userId, long id) {
        settingsManager.requireEmail(userId, id);
        throw new BusinessException("外部邮箱验证服务尚未配置，当前仅保存邮箱地址偏好", BusinessErrorCode.NOT_CONFIGURED);
    }

    public SettingsVO primaryEmail(long userId, long id) {
        settingsManager.primaryEmail(userId, id);
        return snapshot(userId);
    }

    public SettingsVO unbindEmail(long userId, long id) {
        settingsManager.unbindEmail(userId, id);
        return snapshot(userId);
    }

    private SettingsVO snapshot(long userId) {
        Map<String, String> sections = settingsManager.sections(userId);
        String appsJson = sections.getOrDefault("apps", "");
        List<AppIntegrationDTO> apps = readApps(appsJson);
        NotificationSettingsDTO notifications =
                read(
                        sections.get("notifications"),
                        NotificationSettingsDTO.class,
                        new NotificationSettingsDTO(false, true, true, true, false));
        ReportSettingsDTO reports =
                read(sections.get("reports"), ReportSettingsDTO.class, new ReportSettingsDTO("星期一"));
        AppearanceSettingsDTO appearance =
                read(sections.get("appearance"), AppearanceSettingsDTO.class, new AppearanceSettingsDTO("plain"));
        SecuritySettingsDTO preferences =
                read(
                        sections.get("security"),
                        SecuritySettingsDTO.class,
                        new SecuritySettingsDTO(false, false, "8 小时", List.of()));
        SecuritySettingsDTO security =
                new SecuritySettingsDTO(
                        false,
                        preferences.loginAlerts(),
                        preferences.sessionTimeout(),
                        List.of(new ActiveSessionVO(1L, "当前登录会话", "未采集", "当前会话", true)));
        return new SettingsVO(
                aiSettingsService.get(userId),
                apps,
                settingsManager.emails(userId),
                notifications,
                reports,
                security,
                appearance);
    }

    private SettingsVO updatePreferences(long userId, String column, Object preferences) {
        settingsManager.saveSection(userId, column, objectMapper.writeValueAsString(preferences));
        return snapshot(userId);
    }

    private <T> T read(String json, Class<T> type, T fallback) {
        return StringUtils.hasText(json)
                ? objectMapper.treeToValue(
                        withDefaults(objectMapper.readTree(json), objectMapper.valueToTree(fallback)), type)
                : fallback;
    }

    private List<AppIntegrationDTO> readApps(String json) {
        List<AppIntegrationDTO> defaults = defaultApps();
        if (!StringUtils.hasText(json)) {
            return defaults;
        }
        JsonNode stored = objectMapper.readTree(json);
        if (!stored.isArray()) {
            return objectMapper.readValue(json, new tools.jackson.core.type.TypeReference<>() {});
        }
        List<AppIntegrationDTO> apps = new ArrayList<>();
        for (JsonNode app : stored) {
            String id = app.path("id").asString("");
            AppIntegrationDTO fallback =
                    defaults.stream()
                            .filter(candidate -> candidate.id().equals(id))
                            .findFirst()
                            .orElseGet(
                                    () ->
                                            new AppIntegrationDTO(
                                                    id, id, "", true, new AppOptionsDTO("手动", false, false)));
            apps.add(
                    objectMapper.treeToValue(
                            withDefaults(app, objectMapper.valueToTree(fallback)), AppIntegrationDTO.class));
        }
        return apps;
    }

    /** Fill newly introduced fields without treating explicit false or null as an absent preference. */
    private static JsonNode withDefaults(JsonNode stored, JsonNode defaults) {
        if (stored instanceof ObjectNode object && defaults instanceof ObjectNode defaultObject) {
            for (var field : defaultObject.properties()) {
                JsonNode existing = object.get(field.getKey());
                if (existing == null) {
                    object.set(field.getKey(), field.getValue());
                } else {
                    withDefaults(existing, field.getValue());
                }
            }
        }
        return stored;
    }

    private static List<AppIntegrationDTO> defaultApps() {
        AppOptionsDTO options = new AppOptionsDTO("手动", false, false);
        return List.of(
                new AppIntegrationDTO("projects", "项目管理", "工作台应用偏好", true, options),
                new AppIntegrationDTO("mail", "邮件中心", "本地草稿与收件箱，外部同步尚未配置", true, options),
                new AppIntegrationDTO("daily-review", "复盘报告", "日常记录与周期复盘", true, options),
                new AppIntegrationDTO("notes", "笔记", "Markdown 笔记与目录", true, options),
                new AppIntegrationDTO("blog", "博客", "个人文章与草稿", true, options));
    }
}
