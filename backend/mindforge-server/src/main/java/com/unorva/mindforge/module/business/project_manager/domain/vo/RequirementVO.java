package com.unorva.mindforge.module.business.project_manager.domain.vo;

public record RequirementVO(
        Long id,
        String title,
        String description,
        String priority,
        String status,
        String owner,
        String dueDate
) {
}
