package com.unorva.mindforge.module.system.settings.domain.vo;

import com.unorva.mindforge.module.business.ai.domain.vo.AiSettingsVO;
import com.unorva.mindforge.module.system.settings.domain.dto.AppIntegrationDTO;
import com.unorva.mindforge.module.system.settings.domain.dto.AppearanceSettingsDTO;
import com.unorva.mindforge.module.system.settings.domain.dto.NotificationSettingsDTO;
import com.unorva.mindforge.module.system.settings.domain.dto.ReportSettingsDTO;
import com.unorva.mindforge.module.system.settings.domain.dto.SecuritySettingsDTO;

import java.util.List;

public record SettingsVO(
        AiSettingsVO ai,
        List<AppIntegrationDTO> apps,
        List<EmailBindingVO> emails,
        NotificationSettingsDTO notifications,
        ReportSettingsDTO reports,
        SecuritySettingsDTO security,
        AppearanceSettingsDTO appearance) {}
