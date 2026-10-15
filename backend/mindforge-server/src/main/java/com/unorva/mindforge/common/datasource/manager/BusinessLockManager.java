package com.unorva.mindforge.common.datasource.manager;

import lombok.RequiredArgsConstructor;

import com.unorva.mindforge.common.datasource.dao.BusinessLockDao;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionSynchronizationManager;

/** Transaction-scoped write serialization for one user's records in one business module. */
@Component
@RequiredArgsConstructor
public class BusinessLockManager {
    private final BusinessLockDao businessLockDao;

    public void lock(long userId, String module) {
        if (!TransactionSynchronizationManager.isActualTransactionActive()) {
            throw new IllegalStateException("Business locks require an active database transaction");
        }
        if (userId <= 0 || module == null || !module.matches("[a-z]{1,32}")) {
            throw new IllegalArgumentException("Invalid business lock key");
        }
        businessLockDao.ensureKey(userId, module);
        businessLockDao.lockKey(userId, module);
    }
}
