package com.unorva.mindforge.module.business.project_manager.service;

import cn.dev33.satoken.stp.StpUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.unorva.mindforge.common.exception.BusinessException;
import com.unorva.mindforge.common.exception.RepositoryErrorCode;
import com.unorva.mindforge.module.business.project_manager.domain.entity.DefectEntity;
import com.unorva.mindforge.module.business.project_manager.domain.entity.ProjectEntity;
import com.unorva.mindforge.module.business.project_manager.domain.entity.RequirementEntity;
import com.unorva.mindforge.module.business.project_manager.domain.param.DefectSaveParam;
import com.unorva.mindforge.module.business.project_manager.domain.param.ProjectSaveParam;
import com.unorva.mindforge.module.business.project_manager.domain.param.RequirementSaveParam;
import com.unorva.mindforge.module.business.project_manager.domain.vo.DefectVO;
import com.unorva.mindforge.module.business.project_manager.domain.vo.ProjectVO;
import com.unorva.mindforge.module.business.project_manager.domain.vo.RequirementVO;
import com.unorva.mindforge.module.business.project_manager.manager.DefectManager;
import com.unorva.mindforge.module.business.project_manager.manager.ProjectManager;
import com.unorva.mindforge.module.business.project_manager.manager.RequirementManager;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class ProjectManagerService {

    private static final Set<String> PROJECT_STATUSES = Set.of("规划中", "进行中", "已完成", "已归档");
    private static final Set<String> REQUIREMENT_STATUSES = Set.of("待处理", "进行中", "已完成");
    private static final Set<String> DEFECT_STATUSES = Set.of("待修复", "修复中", "待验证", "已关闭");
    private static final Set<String> PRIORITIES = Set.of("低", "中", "高");
    private static final Set<String> SEVERITIES = Set.of("轻微", "一般", "严重", "阻断");

    private final ProjectManager projectManager;
    private final RequirementManager requirementManager;
    private final DefectManager defectManager;

    public List<ProjectVO> getProjectList() {
        return projectManager.list(new LambdaQueryWrapper<ProjectEntity>()
                        .eq(ProjectEntity::getUserId, currentUserId())
                        .orderByDesc(ProjectEntity::getUpdatedTime))
                .stream()
                .map(this::toProjectVO)
                .toList();
    }

    public ProjectVO getProject(Long projectId) {
        return toProjectVO(getOwnedProject(projectId));
    }

    public ProjectVO createProject(ProjectSaveParam param) {
        validateProjectStatus(param.status());
        ProjectEntity project = new ProjectEntity();
        project.setUserId(currentUserId());
        project.setOwnerId(currentUserId());
        applyProject(project, param);
        saveOrThrow(projectManager.save(project));
        return toProjectVO(project);
    }

    public ProjectVO updateProject(Long projectId, ProjectSaveParam param) {
        validateProjectStatus(param.status());
        ProjectEntity project = getOwnedProject(projectId);
        applyProject(project, param);
        saveOrThrow(projectManager.updateById(project));
        return toProjectVO(project);
    }

    public void archiveProject(Long projectId) {
        ProjectEntity project = getOwnedProject(projectId);
        project.setStatus("已归档");
        saveOrThrow(projectManager.updateById(project));
    }

    public RequirementVO createRequirement(Long projectId, RequirementSaveParam param) {
        getOwnedProject(projectId);
        validateRequirement(param);
        RequirementEntity requirement = new RequirementEntity();
        requirement.setProjectId(projectId);
        requirement.setOwnerId(currentUserId());
        applyRequirement(requirement, param);
        saveOrThrow(requirementManager.save(requirement));
        return toRequirementVO(requirement);
    }

    public RequirementVO updateRequirement(Long projectId, Long requirementId, RequirementSaveParam param) {
        getOwnedProject(projectId);
        validateRequirement(param);
        RequirementEntity requirement = getRequirement(projectId, requirementId);
        applyRequirement(requirement, param);
        saveOrThrow(requirementManager.updateById(requirement));
        return toRequirementVO(requirement);
    }

    public void updateRequirementStatus(Long projectId, Long requirementId, String status) {
        getOwnedProject(projectId);
        validateStatus(status, REQUIREMENT_STATUSES, "需求状态不合法");
        RequirementEntity requirement = getRequirement(projectId, requirementId);
        requirement.setStatus(status);
        saveOrThrow(requirementManager.updateById(requirement));
    }

    public void deleteRequirement(Long projectId, Long requirementId) {
        getOwnedProject(projectId);
        RequirementEntity requirement = getRequirement(projectId, requirementId);
        saveOrThrow(requirementManager.removeById(requirement.getId()));
        defectManager.update(new LambdaUpdateWrapper<DefectEntity>()
                .eq(DefectEntity::getProjectId, projectId)
                .eq(DefectEntity::getRequirementId, requirementId)
                .set(DefectEntity::getRequirementId, null));
    }

    public DefectVO createDefect(Long projectId, DefectSaveParam param) {
        getOwnedProject(projectId);
        validateDefect(projectId, param);
        DefectEntity defect = new DefectEntity();
        defect.setProjectId(projectId);
        defect.setOwnerId(currentUserId());
        applyDefect(defect, param);
        saveOrThrow(defectManager.save(defect));
        return toDefectVO(defect);
    }

    public DefectVO updateDefect(Long projectId, Long defectId, DefectSaveParam param) {
        getOwnedProject(projectId);
        validateDefect(projectId, param);
        DefectEntity defect = getDefect(projectId, defectId);
        applyDefect(defect, param);
        saveOrThrow(defectManager.updateById(defect));
        return toDefectVO(defect);
    }

    public void updateDefectStatus(Long projectId, Long defectId, String status) {
        getOwnedProject(projectId);
        validateStatus(status, DEFECT_STATUSES, "缺陷状态不合法");
        DefectEntity defect = getDefect(projectId, defectId);
        defect.setStatus(status);
        saveOrThrow(defectManager.updateById(defect));
    }

    public void deleteDefect(Long projectId, Long defectId) {
        getOwnedProject(projectId);
        saveOrThrow(defectManager.removeById(getDefect(projectId, defectId).getId()));
    }

    private ProjectEntity getOwnedProject(Long projectId) {
        ProjectEntity project = projectManager.getOne(new LambdaQueryWrapper<ProjectEntity>()
                .eq(ProjectEntity::getId, projectId)
                .eq(ProjectEntity::getUserId, currentUserId()));
        if (project == null) {
            throw new BusinessException("项目不存在或无权访问", RepositoryErrorCode.UNKNOWN_ERROR);
        }
        return project;
    }

    private RequirementEntity getRequirement(Long projectId, Long requirementId) {
        RequirementEntity requirement = requirementManager.getOne(new LambdaQueryWrapper<RequirementEntity>()
                .eq(RequirementEntity::getId, requirementId)
                .eq(RequirementEntity::getProjectId, projectId));
        if (requirement == null) {
            throw new BusinessException("需求不存在或不属于当前项目", RepositoryErrorCode.UNKNOWN_ERROR);
        }
        return requirement;
    }

    private DefectEntity getDefect(Long projectId, Long defectId) {
        DefectEntity defect = defectManager.getOne(new LambdaQueryWrapper<DefectEntity>()
                .eq(DefectEntity::getId, defectId)
                .eq(DefectEntity::getProjectId, projectId));
        if (defect == null) {
            throw new BusinessException("缺陷不存在或不属于当前项目", RepositoryErrorCode.UNKNOWN_ERROR);
        }
        return defect;
    }

    private void validateProjectStatus(String status) {
        validateStatus(status, PROJECT_STATUSES, "项目状态不合法");
    }

    private void validateRequirement(RequirementSaveParam param) {
        validateStatus(param.status(), REQUIREMENT_STATUSES, "需求状态不合法");
        validateStatus(param.priority(), PRIORITIES, "需求优先级不合法");
    }

    private void validateDefect(Long projectId, DefectSaveParam param) {
        validateStatus(param.status(), DEFECT_STATUSES, "缺陷状态不合法");
        validateStatus(param.priority(), PRIORITIES, "缺陷优先级不合法");
        validateStatus(param.severity(), SEVERITIES, "缺陷严重程度不合法");
        if (param.requirementId() != null) {
            getRequirement(projectId, param.requirementId());
        }
    }

    private void validateStatus(String value, Set<String> allowedValues, String message) {
        if (!allowedValues.contains(value)) {
            throw new BusinessException(message, RepositoryErrorCode.UPDATE_FAILED);
        }
    }

    private void applyProject(ProjectEntity project, ProjectSaveParam param) {
        project.setName(param.name().trim());
        project.setDescription(trimToNull(param.description()));
        project.setStatus(param.status());
        project.setStartDate(param.startDate());
        project.setEndDate(param.endDate());
    }

    private void applyRequirement(RequirementEntity requirement, RequirementSaveParam param) {
        requirement.setTitle(param.title().trim());
        requirement.setDescription(trimToNull(param.description()));
        requirement.setPriority(param.priority());
        requirement.setStatus(param.status());
        requirement.setDueDate(param.dueDate());
    }

    private void applyDefect(DefectEntity defect, DefectSaveParam param) {
        defect.setTitle(param.title().trim());
        defect.setDescription(trimToNull(param.description()));
        defect.setReproductionSteps(trimToNull(param.reproductionSteps()));
        defect.setRequirementId(param.requirementId());
        defect.setSeverity(param.severity());
        defect.setPriority(param.priority());
        defect.setStatus(param.status());
        defect.setDueDate(param.dueDate());
    }

    private ProjectVO toProjectVO(ProjectEntity project) {
        List<RequirementVO> requirements = requirementManager.list(new LambdaQueryWrapper<RequirementEntity>()
                        .eq(RequirementEntity::getProjectId, project.getId())
                        .orderByDesc(RequirementEntity::getUpdatedTime))
                .stream()
                .map(this::toRequirementVO)
                .toList();
        List<DefectVO> defects = defectManager.list(new LambdaQueryWrapper<DefectEntity>()
                        .eq(DefectEntity::getProjectId, project.getId())
                        .orderByDesc(DefectEntity::getUpdatedTime))
                .stream()
                .map(this::toDefectVO)
                .toList();
        return new ProjectVO(project.getId(), project.getName(), emptyIfNull(project.getDescription()), project.getStatus(), "我",
                formatDate(project.getStartDate()), formatDate(project.getEndDate()), requirements, defects);
    }

    private RequirementVO toRequirementVO(RequirementEntity requirement) {
        return new RequirementVO(requirement.getId(), requirement.getTitle(), emptyIfNull(requirement.getDescription()), requirement.getPriority(),
                requirement.getStatus(), "我", formatDate(requirement.getDueDate()));
    }

    private DefectVO toDefectVO(DefectEntity defect) {
        return new DefectVO(defect.getId(), defect.getTitle(), emptyIfNull(defect.getDescription()), emptyIfNull(defect.getReproductionSteps()),
                defect.getSeverity(), defect.getPriority(), defect.getStatus(), "我", formatDate(defect.getDueDate()), defect.getRequirementId());
    }

    private Long currentUserId() {
        return StpUtil.getLoginIdAsLong();
    }

    private void saveOrThrow(boolean result) {
        if (!result) {
            throw new BusinessException(RepositoryErrorCode.INSERT_OR_UPDATE_FAILED);
        }
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private String emptyIfNull(String value) {
        return value == null ? "" : value;
    }

    private String formatDate(LocalDate value) {
        return value == null ? "" : value.toString();
    }
}
