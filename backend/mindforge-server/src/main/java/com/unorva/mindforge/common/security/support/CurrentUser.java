package com.unorva.mindforge.common.security.support;

import cn.dev33.satoken.stp.StpUtil;

/** Access to the authenticated user, independent of database storage. */
public final class CurrentUser {
    private CurrentUser() {}

    public static long id() {
        return StpUtil.getLoginIdAsLong();
    }
}
