package com.unorva.mindforge.module.system.settings.manager;

import cn.dev33.satoken.stp.StpUtil;

import org.springframework.stereotype.Component;

/** Session operations receive an explicit token, without accessing the request context. */
@Component
public class SettingsSessionManager {
    public void renew(String token, long timeout) {
        StpUtil.renewTimeout(token, timeout);
    }
}
