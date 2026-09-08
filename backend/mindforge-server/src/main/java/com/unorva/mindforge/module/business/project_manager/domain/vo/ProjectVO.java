package com.unorva.mindforge.module.business.project_manager.domain.vo;

import java.util.List;

public record ProjectVO(
        Long id,
        String name,
        String description,
        String status,
        String owner,
        String startDate,
        String endDate,
        List<RequirementVO> requirements,
        List<DefectVO> defects
) {
}
