package com.unorva.mindforge.module.business.mail.controller;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.unorva.mindforge.common.security.support.CurrentUser;
import com.unorva.mindforge.module.business.mail.domain.form.MailPatchForm;
import com.unorva.mindforge.module.business.mail.service.MailAccountService;
import com.unorva.mindforge.module.business.mail.service.MailLiveService;
import com.unorva.mindforge.module.business.mail.service.MailService;

import org.junit.jupiter.api.Test;

/** Foreground changes wake other tabs only after the write has succeeded. */
class MailControllerLiveTest {
    private final MailService mail = mock(MailService.class);
    private final MailAccountService accounts = mock(MailAccountService.class);
    private final MailLiveService live = mock(MailLiveService.class);
    private final MailController controller = new MailController(mail, accounts, live);

    @Test
    void aSuccessfulFlagChangeNotifiesOnlyTheCurrentUser() {
        try (var user = mockStatic(CurrentUser.class)) {
            user.when(CurrentUser::id).thenReturn(7L);
            var form = new MailPatchForm(null, true, null);
            controller.patch(31L, form);
            var order = inOrder(mail, live);
            order.verify(mail).patch(7L, 31L, form);
            order.verify(live).changed(7L);
            verifyNoMoreInteractions(live);
        }
    }

    @Test
    void aFailedWriteDoesNotPublishASuccessfulSnapshot() {
        try (var user = mockStatic(CurrentUser.class)) {
            user.when(CurrentUser::id).thenReturn(7L);
            doThrow(new IllegalStateException("write failed")).when(mail).delete(7L, 31L);
            assertThrows(IllegalStateException.class, () -> controller.delete(31L));
            verifyNoInteractions(live);
        }
    }
}
