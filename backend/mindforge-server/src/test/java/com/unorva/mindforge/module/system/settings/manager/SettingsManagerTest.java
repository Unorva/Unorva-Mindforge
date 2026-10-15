package com.unorva.mindforge.module.system.settings.manager;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.unorva.mindforge.common.exception.BusinessException;
import com.unorva.mindforge.module.system.settings.dao.EmailBindingDao;
import com.unorva.mindforge.module.system.settings.dao.UserSettingDao;

import org.junit.jupiter.api.Test;

class SettingsManagerTest {
    private final UserSettingDao settings = mock(UserSettingDao.class);
    private final EmailBindingDao emails = mock(EmailBindingDao.class);
    private final SettingsManager manager = new SettingsManager(settings, emails);

    @Test
    void refusesToRemovePrimaryEmail() {
        when(emails.isPrimary(7L, 18L)).thenReturn(true);
        assertThrows(BusinessException.class, () -> manager.unbindEmail(7L, 18L));
        verify(settings).initialize(7L);
        verify(settings).lock(7L);
        verify(emails, never()).unbind(anyLong(), anyLong());
    }

    @Test
    void refusesToExceedEmailBindingLimit() {
        when(emails.count(7L)).thenReturn(20L);
        assertThrows(BusinessException.class, () -> manager.bindEmail(7L, "test@example.test", "自定义"));
        verify(settings).lock(7L);
        verify(emails, never()).bind(any());
    }

    @Test
    void missingOwnedEmailCannotBeDeleted() {
        when(emails.isPrimary(7L, 18L)).thenReturn(null);
        assertThrows(BusinessException.class, () -> manager.unbindEmail(7L, 18L));
        verify(emails, never()).unbind(anyLong(), anyLong());
    }
}
