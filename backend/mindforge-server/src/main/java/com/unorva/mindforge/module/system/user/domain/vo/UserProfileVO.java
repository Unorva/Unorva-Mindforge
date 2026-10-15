package com.unorva.mindforge.module.system.user.domain.vo;

/** 用户资料视图，不包含密码哈希。 */
public record UserProfileVO(Long id, String nickname, String email, String phone, String avatar, Integer version) {}
