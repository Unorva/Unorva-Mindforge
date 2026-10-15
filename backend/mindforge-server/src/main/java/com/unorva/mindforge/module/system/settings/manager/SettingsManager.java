package com.unorva.mindforge.module.system.settings.manager;

import static com.unorva.mindforge.common.datasource.support.DaoSupport.requireChanged;

import com.unorva.mindforge.common.exception.BusinessErrorCode;
import com.unorva.mindforge.common.exception.BusinessException;
import com.unorva.mindforge.module.system.settings.dao.EmailBindingDao;
import com.unorva.mindforge.module.system.settings.dao.UserSettingDao;
import com.unorva.mindforge.module.system.settings.domain.entity.EmailBindingEntity;
import com.unorva.mindforge.module.system.settings.domain.entity.UserSettingEntity;
import com.unorva.mindforge.module.system.settings.domain.vo.EmailBindingVO;

import lombok.RequiredArgsConstructor;

import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

/** Database transactions for preferences and email-address preferences. */
@Component
@RequiredArgsConstructor
public class SettingsManager {
    private final UserSettingDao settings;
    private final EmailBindingDao emails;

    public Map<String, String> sections(long userId) {
        UserSettingEntity entity = settings.find(userId);
        return entity == null
                ? Map.of()
                : Map.of(
                        "apps",
                        value(entity.getAppsJson()),
                        "notifications",
                        value(entity.getNotificationsJson()),
                        "reports",
                        value(entity.getReportsJson()),
                        "security",
                        value(entity.getSecurityJson()));
    }

    public List<EmailBindingVO> emails(long userId) {
        return emails.list(userId);
    }

    private void lock(long userId) {
        settings.initialize(userId);
        settings.lock(userId);
    }

    @Transactional(rollbackFor = Exception.class)
    public void saveSection(long userId, String section, String json) {
        lock(userId);
        switch (section) {
            case "apps_json" -> settings.saveApps(userId, json);
            case "notifications_json" -> settings.saveNotifications(userId, json);
            case "reports_json" -> settings.saveReports(userId, json);
            case "security_json" -> settings.saveSecurity(userId, json);
            default -> throw new IllegalArgumentException("Unknown settings section");
        }
    }

    @Transactional(rollbackFor = Exception.class)
    public void bindEmail(long userId, String email, String provider) {
        lock(userId);
        long count = emails.count(userId);
        if (count >= 20) throw new BusinessException("最多保存 20 个邮箱地址", BusinessErrorCode.INVALID_INPUT);
        EmailBindingEntity entity = new EmailBindingEntity();
        entity.setUserId(userId);
        entity.setEmail(email);
        entity.setProvider(provider);
        entity.setIsPrimary(count == 0);
        emails.bind(entity);
    }

    public void requireEmail(long userId, long id) {
        if (emails.countOwned(userId, id) == 0) throw new BusinessException(BusinessErrorCode.NOT_FOUND);
    }

    @Transactional(rollbackFor = Exception.class)
    public void primaryEmail(long userId, long id) {
        lock(userId);
        requireEmail(userId, id);
        emails.primary(userId, id);
    }

    @Transactional(rollbackFor = Exception.class)
    public void unbindEmail(long userId, long id) {
        lock(userId);
        Boolean primary = emails.isPrimary(userId, id);
        if (primary == null) throw new BusinessException(BusinessErrorCode.NOT_FOUND);
        if (primary) throw new BusinessException("主要邮箱不能解绑，请先切换主要邮箱", BusinessErrorCode.CONFLICT);
        requireChanged(emails.unbind(userId, id));
    }

    private static String value(String value) {
        return value == null ? "" : value;
    }
}
