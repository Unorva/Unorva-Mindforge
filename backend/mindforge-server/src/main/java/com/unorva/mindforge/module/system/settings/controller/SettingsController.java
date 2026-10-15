package com.unorva.mindforge.module.system.settings.controller;

import cn.dev33.satoken.stp.StpUtil;

import com.unorva.mindforge.common.security.support.CurrentUser;
import com.unorva.mindforge.common.web.form.IdForm;
import com.unorva.mindforge.common.web.vo.Result;
import com.unorva.mindforge.module.business.ai.domain.form.AiSaveForm;
import com.unorva.mindforge.module.system.settings.domain.form.AppIntegrationForm;
import com.unorva.mindforge.module.system.settings.domain.form.EmailBindForm;
import com.unorva.mindforge.module.system.settings.domain.form.NotificationSettingsForm;
import com.unorva.mindforge.module.system.settings.domain.form.ReportSettingsForm;
import com.unorva.mindforge.module.system.settings.domain.form.SecuritySettingsForm;
import com.unorva.mindforge.module.system.settings.domain.vo.SettingsVO;
import com.unorva.mindforge.module.system.settings.service.SettingsService;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import lombok.RequiredArgsConstructor;

import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/** Workspace settings compatible with the account settings UI. */
@RestController
@Validated
@RequiredArgsConstructor
public class SettingsController {
    private final SettingsService settingsService;

    @GetMapping("/api/data/settings/SettingsData")
    public Result<SettingsVO> get() {
        return Result.success(settingsService.get(CurrentUser.id()));
    }

    @PutMapping("/api/data/settings/ai")
    public Result<SettingsVO> saveAi(@RequestBody @Valid AiSaveForm param) {
        return Result.success(settingsService.saveAi(CurrentUser.id(), param));
    }

    @DeleteMapping("/api/data/settings/ai/credentials")
    public Result<SettingsVO> removeCredential() {
        return Result.success(settingsService.removeCredential(CurrentUser.id()));
    }

    @PutMapping("/api/data/settings/apps")
    public Result<SettingsVO> saveApps(@RequestBody @Size(max = 20) List<@NotNull @Valid AppIntegrationForm> apps) {
        return Result.success(settingsService.saveApps(CurrentUser.id(), apps));
    }

    @PostMapping("/api/data/settings/emails/bind")
    public Result<SettingsVO> bindEmail(@RequestBody @Valid EmailBindForm param) {
        return Result.success(settingsService.bindEmail(CurrentUser.id(), param));
    }

    @PutMapping("/api/data/settings/emails/verify")
    public Result<SettingsVO> verifyEmail(@RequestBody @Valid IdForm param) {
        return Result.success(settingsService.verifyEmail(CurrentUser.id(), param.id()));
    }

    @PutMapping("/api/data/settings/emails/primary")
    public Result<SettingsVO> primaryEmail(@RequestBody @Valid IdForm param) {
        return Result.success(settingsService.primaryEmail(CurrentUser.id(), param.id()));
    }

    @DeleteMapping("/api/data/settings/emails/unbind")
    public Result<SettingsVO> unbindEmail(@RequestBody @Valid IdForm param) {
        return Result.success(settingsService.unbindEmail(CurrentUser.id(), param.id()));
    }

    @PutMapping("/api/data/settings/notifications")
    public Result<SettingsVO> saveNotifications(@RequestBody @Valid NotificationSettingsForm param) {
        return Result.success(settingsService.saveNotifications(CurrentUser.id(), param));
    }

    @PutMapping("/api/data/settings/reports")
    public Result<SettingsVO> saveReports(@RequestBody @Valid ReportSettingsForm param) {
        return Result.success(settingsService.saveReports(CurrentUser.id(), param));
    }

    @PutMapping("/api/data/settings/security")
    public Result<SettingsVO> saveSecurity(@RequestBody @Valid SecuritySettingsForm param) {
        return Result.success(settingsService.saveSecurity(CurrentUser.id(), StpUtil.getTokenValue(), param));
    }
}
