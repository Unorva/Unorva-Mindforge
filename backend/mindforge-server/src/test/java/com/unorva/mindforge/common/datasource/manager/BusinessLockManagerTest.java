package com.unorva.mindforge.common.datasource.manager;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;

import org.junit.jupiter.api.Test;
import com.unorva.mindforge.common.datasource.dao.BusinessLockDao;
import org.springframework.transaction.support.TransactionSynchronizationManager;

class BusinessLockManagerTest {
    @Test
    void writesCannotAcquireAnIneffectiveLockOutsideATransaction() {
        BusinessLockDao dao = mock(BusinessLockDao.class);
        BusinessLockManager locks = new BusinessLockManager(dao);
        assertThrows(IllegalStateException.class, () -> locks.lock(11L, "notes"));
        verifyNoInteractions(dao);
    }

    @Test
    void unrelatedModulesUseDifferentKeysForTheSameUser() {
        BusinessLockDao dao = mock(BusinessLockDao.class);
        BusinessLockManager locks = new BusinessLockManager(dao);
        TransactionSynchronizationManager.setActualTransactionActive(true);
        try {
            locks.lock(11L, "notes");
            locks.lock(11L, "finance");
            verify(dao).ensureKey(11L, "notes");
            verify(dao).lockKey(11L, "notes");
            verify(dao).ensureKey(11L, "finance");
            verify(dao).lockKey(11L, "finance");
            assertThrows(IllegalArgumentException.class, () -> locks.lock(0L, "notes"));
            assertThrows(IllegalArgumentException.class, () -> locks.lock(11L, "untrusted module"));
        } finally {
            TransactionSynchronizationManager.setActualTransactionActive(false);
        }
    }
}
