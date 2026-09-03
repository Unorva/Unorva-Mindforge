package com.unorva.mindforge.common.security.filter;

import com.unorva.mindforge.common.security.login.LoginUser;
import com.unorva.mindforge.common.security.service.TokenService;
import com.unorva.mindforge.common.security.service.UserDetailsServiceImpl;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.jspecify.annotations.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * @Author yanshijie
 * @Date 2026/8/30 22:40
 */
@Service
@RequiredArgsConstructor
public class TokenAuthenticationFilter extends OncePerRequestFilter {

    private final TokenService tokenService;

    private final UserDetailsServiceImpl userDetailsService;

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request, @NonNull HttpServletResponse response, @NonNull FilterChain filterChain) throws ServletException, IOException {
        // 1. 从 Header 获取 Token
        String token = getToken(request);
        // 2. 没有 Token
        if (token == null) {
            filterChain.doFilter(request, response);
            return;
        }
        // 3. Redis 只保存 token -> userId，再按 userId 加载当前认证信息。
        Long userId = tokenService.getUserId(token);
        if (userId == null) {
            filterChain.doFilter(request, response);
            return;
        }
        LoginUser loginUser = userDetailsService.loadLoginUserById(userId);
        // 4. 用户已不存在时，令旧 Token 立即失效。
        if (loginUser == null) {
            tokenService.deleteToken(token);
            filterChain.doFilter(request, response);
            return;
        }
        // 5. 判断 SecurityContext 是否已有认证信息
        if (SecurityContextHolder.getContext().getAuthentication() == null) {
            // 6. 创建已经认证的 Authentication 由于已经通过redis认证，所以这里直接使用loginUser
            UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(loginUser, null, loginUser.getAuthorities());
            // 7. 保存当前请求用户
            SecurityContextHolder.getContext().setAuthentication(authentication);
        }
        // 8. 放行。Token 保持创建时的固定有效期，避免 remember 登录被错误缩短。
        filterChain.doFilter(request, response);
    }

    /**
     * 获取请求头中的 Token
     * @param request 请求
     * @return Token
     */
    private String getToken(HttpServletRequest request) {
        // 1. 从 Header 获取 Token
        String authorization = request.getHeader("Authorization");
        if (authorization == null || !authorization.startsWith("Bearer ")) {
            return null;
        }
        // 2. 去除Bearer 前缀
        return authorization.substring(7);
    }
}
