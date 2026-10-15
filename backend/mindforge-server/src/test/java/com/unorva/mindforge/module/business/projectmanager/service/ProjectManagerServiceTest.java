package com.unorva.mindforge.module.business.projectmanager.service;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.any;
import com.unorva.mindforge.common.exception.BusinessException;
import com.unorva.mindforge.module.business.projectmanager.dao.*;
import com.unorva.mindforge.module.business.projectmanager.domain.entity.*;
import com.unorva.mindforge.module.business.projectmanager.domain.form.*;
import com.unorva.mindforge.module.business.projectmanager.manager.ProjectManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import java.time.LocalDate;
import java.util.List;

class ProjectManagerServiceTest {
    private ProjectDao projects;
    private RequirementDao requirements;
    private DefectDao defects;
    private ProjectManagerService service;
    @BeforeEach void setUp() {
        projects = mock(ProjectDao.class); requirements = mock(RequirementDao.class); defects = mock(DefectDao.class);
        service = new ProjectManagerService(projects, requirements, defects, new ProjectManager(projects, requirements, defects));
    }
    @Test void foreignProjectCannotCreateRequirement() {
        assertThrows(BusinessException.class, () -> service.createRequirement(11L, 7L,
                new RequirementSaveForm("私有需求", "", "中", "待处理", null)));
        verify(projects).selectOwned(11L, 7L, true);
        verifyNoInteractions(requirements, defects);
    }
    @Test void endBeforeStartFailsBeforeDatabaseAccess() {
        assertThrows(BusinessException.class, () -> service.createProject(11L,
                new ProjectSaveForm("项目", "", "规划中", LocalDate.of(2026,10,9), LocalDate.of(2026,10,8))));
        verifyNoInteractions(projects, requirements, defects);
    }
    @Test void staleProjectVersionCannotOverwriteLatestContent() {
        ProjectEntity project=project(7L,"最新项目"); project.setVersion(3);
        when(projects.selectOwned(11L,7L,true)).thenReturn(project);
        assertThrows(BusinessException.class, () -> service.updateProject(11L,7L,
                new ProjectSaveForm("过期项目", "", "规划中", null, null, 2)));
        assertEquals("最新项目", project.getName()); verify(projects,never()).updateById(any(ProjectEntity.class));
    }
    @Test void defectCannotLinkRequirementFromAnotherProject() {
        when(projects.selectOwned(11L,7L,true)).thenReturn(project(7L,"项目"));
        assertThrows(BusinessException.class, () -> service.createDefect(11L,7L,
                new DefectSaveForm("缺陷", "", "", 99L, "一般", "中", "待修复", null)));
        verify(requirements).selectInProject(7L,99L); verifyNoInteractions(defects);
    }
    @Test void clearingDefectOptionalFieldsRemovesExistingValues() {
        when(projects.selectOwned(11L,7L,true)).thenReturn(project(7L,"项目"));
        DefectEntity defect=new DefectEntity(); defect.setId(8L); defect.setProjectId(7L); defect.setRequirementId(99L);
        defect.setDescription("旧描述"); defect.setReproductionSteps("旧步骤"); defect.setDueDate(LocalDate.of(2026,10,8)); defect.setVersion(2);
        when(defects.selectInProject(7L,8L)).thenReturn(defect); when(defects.updateById(any(DefectEntity.class))).thenReturn(1);
        service.updateDefect(11L,7L,8L,new DefectSaveForm("缺陷", "", "", null, "一般", "中", "待修复", null, 2));
        assertNull(defect.getRequirementId()); assertNull(defect.getDescription()); assertNull(defect.getReproductionSteps()); assertNull(defect.getDueDate());
    }
    @Test void projectListLoadsChildrenOnceAndKeepsThemInTheirProject() {
        when(projects.selectOwnedList(11L)).thenReturn(List.of(project(7L,"甲"),project(8L,"乙")));
        RequirementEntity requirement=new RequirementEntity(); requirement.setId(9L); requirement.setProjectId(8L); requirement.setTitle("乙的需求");
        when(requirements.selectByProjects(List.of(7L,8L))).thenReturn(List.of(requirement));
        when(defects.selectByProjects(List.of(7L,8L))).thenReturn(List.of());
        var result=service.getProjectList(11L); assertTrue(result.getFirst().requirements().isEmpty());
        assertEquals(9L,result.get(1).requirements().getFirst().id());
        verify(requirements).selectByProjects(List.of(7L,8L)); verify(defects).selectByProjects(List.of(7L,8L));
    }
    @Test void deletingRequirementDetachesDefectsWithinTheOwnedProject() {
        when(projects.selectOwned(11L,7L,true)).thenReturn(project(7L,"项目"));
        RequirementEntity requirement=new RequirementEntity();requirement.setId(9L);requirement.setProjectId(7L);
        when(requirements.selectInProject(7L,9L)).thenReturn(requirement);when(requirements.deleteById(9L)).thenReturn(1);
        service.deleteRequirement(11L,7L,9L);
        var order=inOrder(projects,requirements,defects); order.verify(projects).selectOwned(11L,7L,true);
        order.verify(requirements).selectInProject(7L,9L);order.verify(requirements).deleteById(9L);order.verify(defects).detachRequirement(7L,9L);
    }
    private ProjectEntity project(Long id,String name) {
        ProjectEntity project=new ProjectEntity();project.setId(id);project.setUserId(11L);project.setName(name);project.setStatus("规划中");return project;
    }
}
