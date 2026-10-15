package com.unorva.mindforge.module.system.auth.manager;
import cn.dev33.satoken.stp.StpUtil;
import cn.dev33.satoken.stp.parameter.SaLoginParameter;
import com.unorva.mindforge.module.system.auth.domain.vo.LoginVO;
import org.springframework.stereotype.Component;
/** Encapsulates session creation and revocation; callers provide the authenticated identity or token. */
@Component
public class AuthManager {
    private static final long SESSION_TIMEOUT_SECONDS = 30L * 60;
    private static final long REMEMBER_TIMEOUT_SECONDS = 30L * 24 * 60 * 60;
    public LoginVO createSession(long userId, boolean remember) {
        long timeout = remember ? REMEMBER_TIMEOUT_SECONDS : SESSION_TIMEOUT_SECONDS;
        StpUtil.login(userId, SaLoginParameter.create().setTimeout(timeout).setIsLastingCookie(false));
        return new LoginVO(StpUtil.getTokenValue());
    }
    public void logout(String token) { StpUtil.logoutByTokenValue(token); }
}
