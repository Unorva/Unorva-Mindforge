package com.unorva.mindforge.module.business.project_manager.controller;

import com.unorva.mindforge.common.web.vo.Result;
import com.unorva.mindforge.module.business.project_manager.domain.param.DefectSaveParam;
import com.unorva.mindforge.module.business.project_manager.domain.param.ProjectSaveParam;
import com.unorva.mindforge.module.business.project_manager.domain.param.RequirementSaveParam;
import com.unorva.mindforge.module.business.project_manager.domain.param.StatusUpdateParam;
import com.unorva.mindforge.module.business.project_manager.domain.vo.DefectVO;
import com.unorva.mindforge.module.business.project_manager.domain.vo.ProjectVO;
import com.unorva.mindforge.module.business.project_manager.domain.vo.RequirementVO;
import com.unorva.mindforge.module.business.project_manager.service.ProjectManagerService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/projects")
@RequiredArgsConstructor
public class ProjectManagerController {

    private final ProjectManagerService projectManagerService;

    @GetMapping
    public Result<List<ProjectVO>> listProjects() {
        return Result.success(projectManagerService.listProjects());
    }

    @GetMapping("/{projectId}")
    public Result<ProjectVO> getProject(@PathVariable Long projectId) {
        return Result.success(projectManagerService.getProject(projectId));
    }

    @PostMapping
    public Result<ProjectVO> createProject(@RequestBody @Valid ProjectSaveParam param) {
        return Result.success(projectManagerService.createProject(param));
    }

    @PutMapping("/{projectId}")
    public Result<ProjectVO> updateProject(@PathVariable Long projectId, @RequestBody @Valid ProjectSaveParam param) {
        return Result.success(projectManagerService.updateProject(projectId, param));
    }

    @PatchMapping("/{projectId}/archive")
    public Result<Void> archiveProject(@PathVariable Long projectId) {
        projectManagerService.archiveProject(projectId);
        return Result.success();
    }

    @PostMapping("/{projectId}/requirements")
    public Result<RequirementVO> createRequirement(@PathVariable Long projectId, @RequestBody @Valid RequirementSaveParam param) {
        return Result.success(projectManagerService.createRequirement(projectId, param));
    }

    @PutMapping("/{projectId}/requirements/{requirementId}")
    public Result<RequirementVO> updateRequirement(@PathVariable Long projectId, @PathVariable Long requirementId, @RequestBody @Valid RequirementSaveParam param) {
        return Result.success(projectManagerService.updateRequirement(projectId, requirementId, param));
    }

    @PatchMapping("/{projectId}/requirements/{requirementId}/status")
    public Result<Void> updateRequirementStatus(@PathVariable Long projectId, @PathVariable Long requirementId, @RequestBody @Valid StatusUpdateParam param) {
        projectManagerService.updateRequirementStatus(projectId, requirementId, param.status());
        return Result.success();
    }

    @DeleteMapping("/{projectId}/requirements/{requirementId}")
    public Result<Void> deleteRequirement(@PathVariable Long projectId, @PathVariable Long requirementId) {
        projectManagerService.deleteRequirement(projectId, requirementId);
        return Result.success();
    }

    @PostMapping("/{projectId}/defects")
    public Result<DefectVO> createDefect(@PathVariable Long projectId, @RequestBody @Valid DefectSaveParam param) {
        return Result.success(projectManagerService.createDefect(projectId, param));
    }

    @PutMapping("/{projectId}/defects/{defectId}")
    public Result<DefectVO> updateDefect(@PathVariable Long projectId, @PathVariable Long defectId, @RequestBody @Valid DefectSaveParam param) {
        return Result.success(projectManagerService.updateDefect(projectId, defectId, param));
    }

    @PatchMapping("/{projectId}/defects/{defectId}/status")
    public Result<Void> updateDefectStatus(@PathVariable Long projectId, @PathVariable Long defectId, @RequestBody @Valid StatusUpdateParam param) {
        projectManagerService.updateDefectStatus(projectId, defectId, param.status());
        return Result.success();
    }

    @DeleteMapping("/{projectId}/defects/{defectId}")
    public Result<Void> deleteDefect(@PathVariable Long projectId, @PathVariable Long defectId) {
        projectManagerService.deleteDefect(projectId, defectId);
        return Result.success();
    }
}
