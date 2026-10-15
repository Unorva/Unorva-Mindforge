package com.unorva.mindforge.module.system.settings.domain.vo;

import java.time.LocalDate;

public record EmailBindingVO(
        long id, String email, String provider, boolean isPrimary, boolean verified, LocalDate boundAt) {}
