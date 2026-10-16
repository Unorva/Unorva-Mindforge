package com.unorva.mindforge.module.system.settings.manager;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.unorva.mindforge.common.exception.BusinessException;
import com.unorva.mindforge.module.system.settings.dao.EmailBindingDao;
import com.unorva.mindforge.module.system.settings.dao.UserSettingDao;
import com.unorva.mindforge.module.system.settings.domain.entity.UserSettingEntity;

import org.junit.jupiter.api.Test;

class SettingsManagerTest {
    private final UserSettingDao settings = mock(UserSettingDao.class);
    private final EmailBindingDao emails = mock(EmailBindingDao.class);
    private final SettingsManager manager = new SettingsManager(settings, emails);

    @Test
    void includesAppearanceInOwnedSettingsAndHandlesExistingNullPreferences() {
        UserSettingEntity existing = new UserSettingEntity();
        existing.setAppearanceJson("{\"background\":\"watermark\"}");
        when(settings.find(7L)).thenReturn(existing);
        assertEquals("{\"background\":\"watermark\"}", manager.sections(7L).get("appearance"));
        existing.setAppearanceJson(null);
        assertEquals("", manager.sections(7L).get("appearance"));
        assertTrue(manager.sections(8L).isEmpty());
    }

    @Test
    void locksOwnedSettingsBeforeSavingAppearanceWithoutChangingOtherSections() {
        String preferences = "{\"background\":\"dots\"}";
        manager.saveSection(7L, "appearance_json", preferences);
        var order = inOrder(settings);
        order.verify(settings).initialize(7L);
        order.verify(settings).lock(7L);
        order.verify(settings).saveAppearance(7L, preferences);
        verifyNoMoreInteractions(settings);
        verifyNoInteractions(emails);
    }

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
