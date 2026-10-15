package com.unorva.mindforge.module.business.projectmanager.service;
import com.unorva.mindforge.common.exception.BusinessException;
import com.unorva.mindforge.common.exception.RepositoryErrorCode;
import com.unorva.mindforge.module.business.projectmanager.domain.entity.*;
import com.unorva.mindforge.module.business.projectmanager.domain.form.*;
import com.unorva.mindforge.module.business.projectmanager.dao.*;
import lombok.RequiredArgsConstructor;
import java.util.List;
import com.unorva.mindforge.module.business.projectmanager.domain.bo.ProjectDetailBO;
import java.util.Objects;
import com.unorva.mindforge.module.business.projectmanager.domain.vo.*;
import com.unorva.mindforge.module.business.projectmanager.manager.ProjectManager;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDate;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/** Project use cases: validate requests, coordinate persistence, and assemble frontend responses. */
@Service
@RequiredArgsConstructor
public class ProjectManagerService {
    private static final Set<String> PROJECT_STATUSES = Set.of("规划中", "进行中", "已完成", "已归档");
    private static final Set<String> REQUIREMENT_STATUSES = Set.of("待处理", "进行中", "已完成");
    private static final Set<String> DEFECT_STATUSES = Set.of("待修复", "修复中", "待验证", "已关闭");
    private static final Set<String> PRIORITIES = Set.of("低", "中", "高");
    private static final Set<String> SEVERITIES = Set.of("轻微", "一般", "严重", "阻断");
    private final ProjectDao projectDao;
    private final RequirementDao requirementDao;
    private final DefectDao defectDao;
    private final ProjectManager projectManager;

    @Transactional(readOnly = true)
    public List<ProjectVO> getProjectList(long userId) {
        List<ProjectEntity> projects = projectDao.selectOwnedList(userId);
        if (projects.isEmpty()) { return List.of(); }
        List<Long> projectIds = projects.stream().map(ProjectEntity::getId).toList();
        Map<Long, List<RequirementEntity>> requirements = requirementDao.selectByProjects(projectIds).stream()
                .collect(Collectors.groupingBy(RequirementEntity::getProjectId));
        Map<Long, List<DefectEntity>> defects = defectDao.selectByProjects(projectIds).stream()
                .collect(Collectors.groupingBy(DefectEntity::getProjectId));
        return projects.stream().map(project -> toProjectVO(project,
                requirements.getOrDefault(project.getId(), List.of()),
                defects.getOrDefault(project.getId(), List.of()))).toList();
    }

    @Transactional(readOnly = true)
    public ProjectVO getProject(long userId, Long projectId) {
        validateId(projectId);
        ProjectEntity project = projectDao.selectOwned(userId, projectId, false);
        if (project == null) { throw new BusinessException("项目不存在或无权访问", RepositoryErrorCode.UNKNOWN_ERROR); }
        return toProjectVO(project);
    }

    public ProjectVO createProject(long userId, ProjectSaveForm form) {
        validateProject(form);
        return toProjectVO(projectManager.createProject(userId, form));
    }

    public ProjectVO updateProject(long userId, Long projectId, ProjectSaveForm form) {
        validateProject(form);
        return toProjectVO(projectManager.updateProject(userId, projectId, form));
    }

    public void archiveProject(long userId, Long projectId) { projectManager.archiveProject(userId, projectId); }

    public RequirementVO createRequirement(long userId, Long projectId, RequirementSaveForm form) {
        validateRequirement(form);
        return toRequirementVO(projectManager.createRequirement(userId, projectId, form));
    }

    public RequirementVO updateRequirement(long userId, Long projectId, Long requirementId, RequirementSaveForm form) {
        validateRequirement(form);
        return toRequirementVO(projectManager.updateRequirement(userId, projectId, requirementId, form));
    }

    public void updateRequirementStatus(long userId, Long projectId, Long requirementId, String status, Integer version) {
        validateStatus(status, REQUIREMENT_STATUSES, "需求状态不合法");
        projectManager.updateRequirementStatus(userId, projectId, requirementId, status, version);
    }

    public void deleteRequirement(long userId, Long projectId, Long requirementId) {
        projectManager.deleteRequirement(userId, projectId, requirementId);
    }

    public DefectVO createDefect(long userId, Long projectId, DefectSaveForm form) {
        validateDefect(form);
        return toDefectVO(projectManager.createDefect(userId, projectId, form));
    }

    public DefectVO updateDefect(long userId, Long projectId, Long defectId, DefectSaveForm form) {
        validateDefect(form);
        return toDefectVO(projectManager.updateDefect(userId, projectId, defectId, form));
    }

    public void updateDefectStatus(long userId, Long projectId, Long defectId, String status, Integer version) {
        validateStatus(status, DEFECT_STATUSES, "缺陷状态不合法");
        projectManager.updateDefectStatus(userId, projectId, defectId, status, version);
    }

    public void deleteDefect(long userId, Long projectId, Long defectId) { projectManager.deleteDefect(userId, projectId, defectId); }
    private void validateProject(ProjectSaveForm param) {
        validateText(param.name(), 200, true, "项目名称");
        validateText(param.description(), 10000, false, "项目描述");
        validateStatus(param.status(), PROJECT_STATUSES, "项目状态不合法");
        validateDate(param.startDate());
        validateDate(param.endDate());
        if (param.startDate() != null && param.endDate() != null && param.startDate().isAfter(param.endDate())) {
            throw new BusinessException("项目结束日期不能早于开始日期", RepositoryErrorCode.UPDATE_FAILED);
        }
    }

    private void validateRequirement(RequirementSaveForm param) {
        validateText(param.title(), 300, true, "需求标题");
        validateText(param.description(), 10000, false, "需求描述");
        validateStatus(param.status(), REQUIREMENT_STATUSES, "需求状态不合法");
        validateStatus(param.priority(), PRIORITIES, "需求优先级不合法");
        validateDate(param.dueDate());
    }

    private void validateDefect(DefectSaveForm param) {
        validateText(param.title(), 300, true, "缺陷标题");
        validateText(param.description(), 10000, false, "缺陷描述");
        validateText(param.reproductionSteps(), 10000, false, "复现步骤");
        validateStatus(param.status(), DEFECT_STATUSES, "缺陷状态不合法");
        validateStatus(param.priority(), PRIORITIES, "缺陷优先级不合法");
        validateStatus(param.severity(), SEVERITIES, "缺陷严重程度不合法");
        validateDate(param.dueDate());
    }

    private void validateStatus(String value, Set<String> allowedValues, String message) {
        if (value == null || !allowedValues.contains(value)) {
            throw new BusinessException(message, RepositoryErrorCode.UPDATE_FAILED);
        }
    }
    private ProjectVO toProjectVO(ProjectDetailBO detail) {
        return toProjectVO(detail.project(), detail.requirements(), detail.defects());
    }

    private ProjectVO toProjectVO(ProjectEntity project) {
        return toProjectVO(project, requirementDao.selectByProjects(List.of(project.getId())),
                defectDao.selectByProjects(List.of(project.getId())));
    }
    private ProjectVO toProjectVO(
            ProjectEntity project, List<RequirementEntity> requirements, List<DefectEntity> defects) {
        return new ProjectVO(
                project.getId(),
                project.getName(),
                emptyIfNull(project.getDescription()),
                project.getStatus(),
                "我",
                formatDate(project.getStartDate()),
                formatDate(project.getEndDate()),
                requirements.stream().map(this::toRequirementVO).toList(),
                defects.stream().map(this::toDefectVO).toList(),
                project.getVersion());
    }

    private RequirementVO toRequirementVO(RequirementEntity requirement) {
        return new RequirementVO(
                requirement.getId(),
                requirement.getTitle(),
                emptyIfNull(requirement.getDescription()),
                requirement.getPriority(),
                requirement.getStatus(),
                "我",
                formatDate(requirement.getDueDate()),
                requirement.getVersion());
    }

    private DefectVO toDefectVO(DefectEntity defect) {
        return new DefectVO(
                defect.getId(),
                defect.getTitle(),
                emptyIfNull(defect.getDescription()),
                emptyIfNull(defect.getReproductionSteps()),
                defect.getSeverity(),
                defect.getPriority(),
                defect.getStatus(),
                "我",
                formatDate(defect.getDueDate()),
                defect.getRequirementId(),
                defect.getVersion());
    }

    private String emptyIfNull(String value) {
        return value == null ? "" : value;
    }

    private String formatDate(LocalDate value) {
        return value == null ? "" : value.toString();
    }

    private void validateText(String value, int maxLength, boolean required, String label) {
        if (required && (value == null || value.isBlank())) {
            throw new BusinessException(label + "不能为空", RepositoryErrorCode.UPDATE_FAILED);
        }
        if (value != null && value.length() > maxLength) {
            throw new BusinessException(label + "长度超出限制", RepositoryErrorCode.UPDATE_FAILED);
        }
    }

    private void validateId(Long id) {
        if (id == null || id <= 0) {
            throw new BusinessException("ID必须为正数", RepositoryErrorCode.UPDATE_FAILED);
        }
    }

    private void validateDate(LocalDate date) {
        if (date != null && (date.getYear() < 1000 || date.getYear() > 9999)) {
            throw new BusinessException("日期必须在1000年至9999年之间", RepositoryErrorCode.UPDATE_FAILED);
        }
    }
}
