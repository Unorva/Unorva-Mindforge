package com.unorva.mindforge.common.datasource.support;

import com.unorva.mindforge.common.exception.BusinessErrorCode;
import com.unorva.mindforge.common.exception.BusinessException;

/** Shared assertions for explicitly scoped Dao operations. */
public final class DaoSupport {
    private DaoSupport() {}

    public static void requireChanged(int count) {
        if (count == 0) {
            throw new BusinessException(BusinessErrorCode.NOT_FOUND);
        }
    }

    public static void requireExists(Long count) {
        if (count == null || count == 0) {
            throw new BusinessException(BusinessErrorCode.NOT_FOUND);
        }
    }

    public static void requireExists(long count) {
        requireExists(count > 0);
    }

    public static void requireExists(boolean exists) {
        if (!exists) {
            throw new BusinessException(BusinessErrorCode.NOT_FOUND);
        }
    }
}
