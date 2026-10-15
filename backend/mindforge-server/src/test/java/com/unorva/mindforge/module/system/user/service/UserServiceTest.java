package com.unorva.mindforge.module.system.user.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.mockStatic;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import cn.dev33.satoken.stp.StpUtil;

import com.unorva.mindforge.common.exception.BusinessException;
import com.unorva.mindforge.module.system.user.domain.entity.UserEntity;
import com.unorva.mindforge.module.system.user.domain.form.PasswordUpdateForm;
import com.unorva.mindforge.module.system.user.domain.form.UserProfileUpdateForm;
import com.unorva.mindforge.module.system.user.dao.UserDao;
import com.unorva.mindforge.module.system.user.manager.UserManager;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.MockedStatic;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

class UserServiceTest {

    private UserDao mapper;
    private PasswordEncoder encoder;
    private UserService service;

    @BeforeEach
    void setUp() {
        mapper = mock(UserDao.class);
        encoder = mock(PasswordEncoder.class);
        service = new UserService(mapper, new UserManager(mapper), encoder);
        UserEntity user = new UserEntity();
        user.setId(11L);
        user.setNickname("昵称");
        user.setEmail("user@example.com");
        user.setPassword("old-hash");
        user.setVersion(2);
        when(mapper.selectById(11L)).thenReturn(user);
    }

    @Test
    void profileReadsOnlyLoggedInUser() {
        try (MockedStatic<StpUtil> session = mockStatic(StpUtil.class)) {
            session.when(StpUtil::getLoginIdAsLong).thenReturn(11L);
            assertEquals(11L, service.getProfile(11L).id());
            verify(mapper).selectById(11L);
        }
    }

    @Test
    void staleProfileAndUnsafeAvatarCannotBeSaved() {
        try (MockedStatic<StpUtil> session = mockStatic(StpUtil.class)) {
            session.when(StpUtil::getLoginIdAsLong).thenReturn(11L);
            assertThrows(
                    BusinessException.class,
                    () -> service.updateProfile(11L, new UserProfileUpdateForm("昵称", "user@example.com", null, null, 1)));
            assertThrows(
                    BusinessException.class,
                    () ->
                            service.updateProfile(11L,
                                    new UserProfileUpdateForm(
                                            "昵称", "user@example.com", null, "javascript:alert(1)", 2)));
            verify(mapper, never()).updateById(any(UserEntity.class));
        }
    }

    @Test
    void wrongCurrentPasswordCannotChangePasswordOrRevokeSession() {
        try (MockedStatic<StpUtil> session = mockStatic(StpUtil.class)) {
            session.when(StpUtil::getLoginIdAsLong).thenReturn(11L);
            assertThrows(
                    BusinessException.class,
                    () -> service.updatePassword(11L, new PasswordUpdateForm("wrong", "new-password")));
            verify(mapper, never()).updateById(any(UserEntity.class));
            verify(encoder, never()).encode(any());
            session.verify(() -> StpUtil.logout(11L), never());
        }
    }

    @Test
    void changingPasswordRevokesSessionsOnlyAfterCommit() {
        when(encoder.matches("old-password", "old-hash")).thenReturn(true);
        when(encoder.encode("new-password")).thenReturn("new-hash");
        when(mapper.updateById(any(UserEntity.class))).thenReturn(1);
        try (MockedStatic<StpUtil> session = mockStatic(StpUtil.class)) {
            session.when(StpUtil::getLoginIdAsLong).thenReturn(11L);
            TransactionSynchronizationManager.initSynchronization();
            try {
                service.updatePassword(11L, new PasswordUpdateForm("old-password", "new-password"));
                session.verify(() -> StpUtil.logout(11L), never());
                for (TransactionSynchronization synchronization :
                        TransactionSynchronizationManager.getSynchronizations()) {
                    synchronization.afterCommit();
                }
                session.verify(() -> StpUtil.logout(11L));
            } finally {
                TransactionSynchronizationManager.clearSynchronization();
            }
        }
    }
}
