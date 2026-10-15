package com.unorva.mindforge.module.business.projectmanager.domain.vo;

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
        Long requirementId,
        Integer version) {}
