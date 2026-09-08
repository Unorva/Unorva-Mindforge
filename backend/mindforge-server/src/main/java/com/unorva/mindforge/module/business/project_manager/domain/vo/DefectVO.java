package com.unorva.mindforge.module.business.project_manager.domain.vo;

public record DefectVO(
        Long id,
        String title,
        String description,
        String reproductionSteps,
        String severity,
        String priority,
        String status,
        String owner,
        String dueDate,
        Long requirementId
) {
}
