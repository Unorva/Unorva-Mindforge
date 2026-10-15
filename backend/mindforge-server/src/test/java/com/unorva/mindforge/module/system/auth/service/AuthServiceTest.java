package com.unorva.mindforge.module.system.auth.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.mockStatic;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import cn.dev33.satoken.stp.StpUtil;

import com.unorva.mindforge.common.exception.BusinessException;
import com.unorva.mindforge.module.system.auth.domain.form.LoginForm;
import com.unorva.mindforge.module.system.auth.domain.form.RegisterForm;
import com.unorva.mindforge.module.system.user.domain.entity.UserEntity;
import com.unorva.mindforge.module.system.user.dao.UserDao;
import com.unorva.mindforge.module.system.auth.manager.AuthManager;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.MockedStatic;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.security.crypto.password.PasswordEncoder;

class AuthServiceTest {

    private UserDao mapper;
    private PasswordEncoder passwordEncoder;
    private AuthService service;
    private AuthManager sessions;

    @BeforeEach
    void setUp() {
        mapper = mock(UserDao.class);
        passwordEncoder = mock(PasswordEncoder.class);
        sessions = mock(AuthManager.class);
        service = new AuthService(mapper, sessions, passwordEncoder);
    }

    @Test
    void registrationNormalizesEmailAndStoresOnlyEncodedPassword() {
        when(passwordEncoder.encode("password123")).thenReturn("encoded-password");
        when(mapper.insert(any(UserEntity.class))).thenReturn(1);
        service.register(new RegisterForm(" 昵称 ", "USER@Example.com", "password123"));
        ArgumentCaptor<UserEntity> userCaptor = ArgumentCaptor.forClass(UserEntity.class);
        verify(mapper).insert(userCaptor.capture());
        assertEquals("user@example.com", userCaptor.getValue().getEmail());
        assertEquals("昵称", userCaptor.getValue().getNickname());
        assertEquals("encoded-password", userCaptor.getValue().getPassword());
    }

    @Test
    void concurrentDuplicateRegistrationReturnsBusinessError() {
        when(passwordEncoder.encode("password123")).thenReturn("encoded-password");
        when(mapper.insert(any(UserEntity.class))).thenThrow(new DuplicateKeyException("duplicate"));
        BusinessException exception =
                assertThrows(
                        BusinessException.class,
                        () -> service.register(new RegisterForm("昵称", "user@example.com", "password123")));
        assertEquals("该邮箱已注册", exception.getMessage());
    }

    @Test
    void shortRegistrationPasswordFailsBeforeHashingOrDatabaseAccess() {
        assertThrows(
                BusinessException.class, () -> service.register(new RegisterForm("昵称", "user@example.com", "short")));
        verifyNoInteractions(mapper, passwordEncoder);
    }

    @Test
    void incorrectPasswordNeverCreatesSession() {
        UserEntity user = new UserEntity();
        user.setId(11L);
        user.setPassword("hash");
        when(mapper.selectByEmail("user@example.com")).thenReturn(user);
        when(passwordEncoder.matches("incorrect", "hash")).thenReturn(false);
        try (MockedStatic<StpUtil> session = mockStatic(StpUtil.class)) {
            assertThrows(
                    BusinessException.class,
                    () -> service.login(new LoginForm("user@example.com", "incorrect", true)));
            session.verifyNoInteractions();
            verifyNoInteractions(sessions);
        }
    }
}
