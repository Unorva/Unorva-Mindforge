package com.unorva.mindforge.module.system.settings.domain.vo;

public record ActiveSessionVO(long id, String device, String location, String lastActive, boolean current) {}
