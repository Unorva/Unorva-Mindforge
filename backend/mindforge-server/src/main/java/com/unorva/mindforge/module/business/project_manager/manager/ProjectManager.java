package com.unorva.mindforge.module.business.project_manager.manager;

import com.baomidou.mybatisplus.spring.service.impl.ServiceImpl;
import com.unorva.mindforge.module.business.project_manager.domain.entity.ProjectEntity;
import com.unorva.mindforge.module.business.project_manager.mapper.ProjectMapper;
import org.springframework.stereotype.Service;

@Service
public class ProjectManager extends ServiceImpl<ProjectMapper, ProjectEntity> {
}
