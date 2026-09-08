package com.unorva.mindforge.module.business.project_manager.manager;

import com.baomidou.mybatisplus.spring.service.impl.ServiceImpl;
import com.unorva.mindforge.module.business.project_manager.domain.entity.RequirementEntity;
import com.unorva.mindforge.module.business.project_manager.mapper.RequirementMapper;
import org.springframework.stereotype.Service;

@Service
public class RequirementManager extends ServiceImpl<RequirementMapper, RequirementEntity> {
}
