package com.unorva.mindforge.module.business.project_manager.manager;

import com.baomidou.mybatisplus.spring.service.impl.ServiceImpl;
import com.unorva.mindforge.module.business.project_manager.domain.entity.DefectEntity;
import com.unorva.mindforge.module.business.project_manager.mapper.DefectMapper;
import org.springframework.stereotype.Service;

@Service
public class DefectManager extends ServiceImpl<DefectMapper, DefectEntity> {
}
