package com.unorva.mindforge.module.business.projectmanager.domain.bo;

import com.unorva.mindforge.module.business.projectmanager.domain.entity.DefectEntity;
import com.unorva.mindforge.module.business.projectmanager.domain.entity.ProjectEntity;
import com.unorva.mindforge.module.business.projectmanager.domain.entity.RequirementEntity;
import java.util.List;

/** Project and children captured in the same transaction. */
public record ProjectDetailBO(ProjectEntity project, List<RequirementEntity> requirements, List<DefectEntity> defects) {}
