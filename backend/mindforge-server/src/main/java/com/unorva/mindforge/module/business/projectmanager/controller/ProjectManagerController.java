package com.unorva.mindforge.module.business.projectmanager.controller;

import com.unorva.mindforge.common.security.support.CurrentUser;
import com.unorva.mindforge.common.web.vo.Result;
import com.unorva.mindforge.module.business.projectmanager.domain.form.DefectSaveForm;
import com.unorva.mindforge.module.business.projectmanager.domain.form.ProjectSaveForm;
import com.unorva.mindforge.module.business.projectmanager.domain.form.RequirementSaveForm;
import com.unorva.mindforge.module.business.projectmanager.domain.form.StatusUpdateForm;
import com.unorva.mindforge.module.business.projectmanager.domain.vo.DefectVO;
import com.unorva.mindforge.module.business.projectmanager.domain.vo.ProjectVO;
import com.unorva.mindforge.module.business.projectmanager.domain.vo.RequirementVO;
import com.unorva.mindforge.module.business.projectmanager.service.ProjectManagerService;

import jakarta.validation.Valid;

import lombok.RequiredArgsConstructor;

import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequiredArgsConstructor
public class ProjectManagerController {

    private final ProjectManagerService projectManagerService;

    /**
     * 获取项目列表
     *
     * @return 项目列表
     */
    @GetMapping("/projects")
    public Result<List<ProjectVO>> getProjectList() {
        return Result.success(projectManagerService.getProjectList(CurrentUser.id()));
    }

    @GetMapping("/projects/{projectId}")
    public Result<ProjectVO> getProject(@PathVariable Long projectId) {
        return Result.success(projectManagerService.getProject(CurrentUser.id(), projectId));
    }

    @PostMapping("/projects")
    public Result<ProjectVO> createProject(@RequestBody @Valid ProjectSaveForm param) {
        return Result.success(projectManagerService.createProject(CurrentUser.id(), param));
    }

    @PutMapping("/projects/{projectId}")
    public Result<ProjectVO> updateProject(@PathVariable Long projectId, @RequestBody @Valid ProjectSaveForm param) {
        return Result.success(projectManagerService.updateProject(CurrentUser.id(), projectId, param));
    }

    @PatchMapping("/projects/{projectId}/archive")
    public Result<Void> archiveProject(@PathVariable Long projectId) {
        projectManagerService.archiveProject(CurrentUser.id(), projectId);
        return Result.success();
    }

    @PostMapping("/projects/{projectId}/requirements")
    public Result<RequirementVO> createRequirement(
            @PathVariable Long projectId, @RequestBody @Valid RequirementSaveForm param) {
        return Result.success(projectManagerService.createRequirement(CurrentUser.id(), projectId, param));
    }

    @PutMapping("/projects/{projectId}/requirements/{requirementId}")
    public Result<RequirementVO> updateRequirement(
            @PathVariable Long projectId,
            @PathVariable Long requirementId,
            @RequestBody @Valid RequirementSaveForm param) {
        return Result.success(projectManagerService.updateRequirement(CurrentUser.id(), projectId, requirementId, param));
    }

    @PatchMapping("/projects/{projectId}/requirements/{requirementId}/status")
    public Result<Void> updateRequirementStatus(
            @PathVariable Long projectId,
            @PathVariable Long requirementId,
            @RequestBody @Valid StatusUpdateForm param) {
        projectManagerService.updateRequirementStatus(CurrentUser.id(), projectId, requirementId, param.status(), param.version());
        return Result.success();
    }

    @DeleteMapping("/projects/{projectId}/requirements/{requirementId}")
    public Result<Void> deleteRequirement(@PathVariable Long projectId, @PathVariable Long requirementId) {
        projectManagerService.deleteRequirement(CurrentUser.id(), projectId, requirementId);
        return Result.success();
    }

    @PostMapping("/projects/{projectId}/defects")
    public Result<DefectVO> createDefect(@PathVariable Long projectId, @RequestBody @Valid DefectSaveForm param) {
        return Result.success(projectManagerService.createDefect(CurrentUser.id(), projectId, param));
    }

    @PutMapping("/projects/{projectId}/defects/{defectId}")
    public Result<DefectVO> updateDefect(
            @PathVariable Long projectId, @PathVariable Long defectId, @RequestBody @Valid DefectSaveForm param) {
        return Result.success(projectManagerService.updateDefect(CurrentUser.id(), projectId, defectId, param));
    }

    @PatchMapping("/projects/{projectId}/defects/{defectId}/status")
    public Result<Void> updateDefectStatus(
            @PathVariable Long projectId, @PathVariable Long defectId, @RequestBody @Valid StatusUpdateForm param) {
        projectManagerService.updateDefectStatus(CurrentUser.id(), projectId, defectId, param.status(), param.version());
        return Result.success();
    }

    @DeleteMapping("/projects/{projectId}/defects/{defectId}")
    public Result<Void> deleteDefect(@PathVariable Long projectId, @PathVariable Long defectId) {
        projectManagerService.deleteDefect(CurrentUser.id(), projectId, defectId);
        return Result.success();
    }
}
