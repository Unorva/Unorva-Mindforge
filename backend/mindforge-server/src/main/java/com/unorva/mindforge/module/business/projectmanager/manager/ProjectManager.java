package com.unorva.mindforge.module.business.projectmanager.manager;

import com.unorva.mindforge.common.exception.BusinessException;
import com.unorva.mindforge.common.exception.RepositoryErrorCode;
import com.unorva.mindforge.module.business.projectmanager.domain.entity.*;
import com.unorva.mindforge.module.business.projectmanager.domain.form.*;
import com.unorva.mindforge.module.business.projectmanager.dao.*;
import lombok.RequiredArgsConstructor;
import java.util.List;
import com.unorva.mindforge.module.business.projectmanager.domain.bo.ProjectDetailBO;
import java.util.Objects;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/** Serializes related project writes and keeps version and relation checks inside the transaction. */
@Component
@RequiredArgsConstructor
public class ProjectManager {
    private final ProjectDao projectDao;
    private final RequirementDao requirementDao;
    private final DefectDao defectDao;

    @Transactional(rollbackFor = Exception.class)
    public ProjectDetailBO createProject(long userId, ProjectSaveForm param) {
        ProjectEntity project = new ProjectEntity();
        project.setUserId(userId);
        project.setOwnerId(userId);
        applyProject(project, param);
        saveOrThrow(projectDao.insert(project) == 1);
        return new ProjectDetailBO(project, List.of(), List.of());
    }

    @Transactional(rollbackFor = Exception.class)
    public ProjectDetailBO updateProject(long userId, Long projectId, ProjectSaveForm param) {
        ProjectEntity project = getOwnedProject(userId, projectId, true);
        verifyVersion(param.version(), project.getVersion());
        applyProject(project, param);
        saveOrThrow(projectDao.updateById(project) == 1);
        return new ProjectDetailBO(project, requirementDao.selectByProjects(List.of(projectId)), defectDao.selectByProjects(List.of(projectId)));
    }

    @Transactional(rollbackFor = Exception.class)
    public void archiveProject(long userId, Long projectId) {
        ProjectEntity project = getOwnedProject(userId, projectId, true);
        if (!"已归档".equals(project.getStatus())) {
            project.setStatus("已归档");
            saveOrThrow(projectDao.updateById(project) == 1);
        }
    }

    @Transactional(rollbackFor = Exception.class)
    public RequirementEntity createRequirement(long userId, Long projectId, RequirementSaveForm param) {
        getOwnedProject(userId, projectId, true);
        RequirementEntity requirement = new RequirementEntity();
        requirement.setProjectId(projectId);
        requirement.setOwnerId(userId);
        applyRequirement(requirement, param);
        saveOrThrow(requirementDao.insert(requirement) == 1);
        return requirement;
    }

    @Transactional(rollbackFor = Exception.class)
    public RequirementEntity updateRequirement(long userId, Long projectId, Long requirementId, RequirementSaveForm param) {
        getOwnedProject(userId, projectId, true);
        RequirementEntity requirement = getRequirement(projectId, requirementId);
        verifyVersion(param.version(), requirement.getVersion());
        applyRequirement(requirement, param);
        saveOrThrow(requirementDao.updateById(requirement) == 1);
        return requirement;
    }

    @Transactional(rollbackFor = Exception.class)
    public void updateRequirementStatus(long userId, Long projectId, Long requirementId, String status, Integer version) {
        getOwnedProject(userId, projectId, true);
        RequirementEntity requirement = getRequirement(projectId, requirementId);
        verifyVersion(version, requirement.getVersion());
        requirement.setStatus(status);
        saveOrThrow(requirementDao.updateById(requirement) == 1);
    }

    @Transactional(rollbackFor = Exception.class)
    public void deleteRequirement(long userId, Long projectId, Long requirementId) {
        getOwnedProject(userId, projectId, true);
        RequirementEntity requirement = getRequirement(projectId, requirementId);
        saveOrThrow(requirementDao.deleteById(requirement.getId()) == 1);
        defectDao.detachRequirement(projectId, requirementId);
    }

    @Transactional(rollbackFor = Exception.class)
    public DefectEntity createDefect(long userId, Long projectId, DefectSaveForm param) {
        getOwnedProject(userId, projectId, true);
        if (param.requirementId() != null) { getRequirement(projectId, param.requirementId()); }
        DefectEntity defect = new DefectEntity();
        defect.setProjectId(projectId);
        defect.setOwnerId(userId);
        applyDefect(defect, param);
        saveOrThrow(defectDao.insert(defect) == 1);
        return defect;
    }

    @Transactional(rollbackFor = Exception.class)
    public DefectEntity updateDefect(long userId, Long projectId, Long defectId, DefectSaveForm param) {
        getOwnedProject(userId, projectId, true);
        if (param.requirementId() != null) { getRequirement(projectId, param.requirementId()); }
        DefectEntity defect = getDefect(projectId, defectId);
        verifyVersion(param.version(), defect.getVersion());
        applyDefect(defect, param);
        saveOrThrow(defectDao.updateById(defect) == 1);
        return defect;
    }

    @Transactional(rollbackFor = Exception.class)
    public void updateDefectStatus(long userId, Long projectId, Long defectId, String status, Integer version) {
        getOwnedProject(userId, projectId, true);
        DefectEntity defect = getDefect(projectId, defectId);
        verifyVersion(version, defect.getVersion());
        defect.setStatus(status);
        saveOrThrow(defectDao.updateById(defect) == 1);
    }

    @Transactional(rollbackFor = Exception.class)
    public void deleteDefect(long userId, Long projectId, Long defectId) {
        getOwnedProject(userId, projectId, true);
        saveOrThrow(defectDao.deleteById(getDefect(projectId, defectId).getId()) == 1);
    }

    private ProjectEntity getOwnedProject(long userId, Long projectId, boolean lockForUpdate) {
        validateId(projectId);
        ProjectEntity project = projectDao.selectOwned(userId, projectId, lockForUpdate);
        if (project == null) { throw new BusinessException("项目不存在或无权访问", RepositoryErrorCode.UNKNOWN_ERROR); }
        return project;
    }

    private RequirementEntity getRequirement(Long projectId, Long requirementId) {
        validateId(requirementId);
        RequirementEntity requirement = requirementDao.selectInProject(projectId, requirementId);
        if (requirement == null) { throw new BusinessException("需求不存在或不属于当前项目", RepositoryErrorCode.UNKNOWN_ERROR); }
        return requirement;
    }

    private DefectEntity getDefect(Long projectId, Long defectId) {
        validateId(defectId);
        DefectEntity defect = defectDao.selectInProject(projectId, defectId);
        if (defect == null) { throw new BusinessException("缺陷不存在或不属于当前项目", RepositoryErrorCode.UNKNOWN_ERROR); }
        return defect;
    }

    private void applyProject(ProjectEntity project, ProjectSaveForm param) {
        project.setName(param.name().trim());
        project.setDescription(trimToNull(param.description()));
        project.setStatus(param.status());
        project.setStartDate(param.startDate());
        project.setEndDate(param.endDate());
    }

    private void applyRequirement(RequirementEntity requirement, RequirementSaveForm param) {
        requirement.setTitle(param.title().trim());
        requirement.setDescription(trimToNull(param.description()));
        requirement.setPriority(param.priority());
        requirement.setStatus(param.status());
        requirement.setDueDate(param.dueDate());
    }

    private void applyDefect(DefectEntity defect, DefectSaveForm param) {
        defect.setTitle(param.title().trim());
        defect.setDescription(trimToNull(param.description()));
        defect.setReproductionSteps(trimToNull(param.reproductionSteps()));
        defect.setRequirementId(param.requirementId());
        defect.setSeverity(param.severity());
        defect.setPriority(param.priority());
        defect.setStatus(param.status());
        defect.setDueDate(param.dueDate());
    }

    private void saveOrThrow(boolean result) {
        if (!result) {
            throw new BusinessException("保存失败或内容已被修改，请刷新后重试", RepositoryErrorCode.INSERT_OR_UPDATE_FAILED);
        }
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private void validateId(Long id) {
        if (id == null || id <= 0) {
            throw new BusinessException("ID必须为正数", RepositoryErrorCode.UPDATE_FAILED);
        }
    }

    private void verifyVersion(Integer expected, Integer actual) {
        if (expected != null && (expected < 0 || !Objects.equals(expected, actual))) {
            throw new BusinessException("内容已被修改，请刷新后重试", RepositoryErrorCode.UPDATE_FAILED);
        }
    }
}
