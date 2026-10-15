package com.unorva.mindforge.module.system.settings.domain.dto;

import com.unorva.mindforge.module.system.settings.domain.vo.ActiveSessionVO;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

import java.util.List;

public record SecuritySettingsDTO(
        boolean twoFactor,
        boolean loginAlerts,
        @NotBlank @Pattern(regexp = "30 分钟|2 小时|8 小时|24 小时") String sessionTimeout,
        List<ActiveSessionVO> activeSessions) {}
