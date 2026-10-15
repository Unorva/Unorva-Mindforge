package com.unorva.mindforge.module.business.dashboard.controller;

import com.unorva.mindforge.common.security.support.CurrentUser;

import com.unorva.mindforge.common.web.vo.Result;
import com.unorva.mindforge.module.business.dashboard.domain.vo.DashboardVO;
import com.unorva.mindforge.module.business.dashboard.service.DashboardService;

import lombok.RequiredArgsConstructor;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/** Personal workspace overview. */
@RestController
@RequiredArgsConstructor
public class DashboardController {

    private final DashboardService dashboardService;

    @GetMapping("/dashboard/summary")
    public Result<DashboardVO> summary() {
        return Result.success(dashboardService.summary(CurrentUser.id()));
    }
}
