package com.unorva.mindforge.module.system.user.manager;
import cn.dev33.satoken.stp.StpUtil;
import com.unorva.mindforge.common.exception.BusinessException;
import com.unorva.mindforge.common.exception.RepositoryErrorCode;
import com.unorva.mindforge.module.system.user.dao.UserDao;
import com.unorva.mindforge.module.system.user.domain.entity.UserEntity;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
/** Short user writes; password changes revoke sessions only after a successful database commit. */
@Component
@RequiredArgsConstructor
public class UserManager {
    private final UserDao userDao;

    @Transactional(rollbackFor = Exception.class)
    public void saveProfile(UserEntity user) {
        try {
            if (userDao.updateById(user) != 1) { throw new BusinessException("个人资料已被修改，请刷新后重试", RepositoryErrorCode.UPDATE_FAILED); }
        } catch (DuplicateKeyException exception) {
            throw new BusinessException("邮箱或电话号码已被使用", RepositoryErrorCode.UPDATE_FAILED);
        }
    }

    @Transactional(rollbackFor = Exception.class)
    public void savePassword(UserEntity user) {
        if (userDao.updateById(user) != 1) { throw new BusinessException("密码已被修改，请重新登录后重试", RepositoryErrorCode.UPDATE_FAILED); }
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override public void afterCommit() { StpUtil.logout(user.getId()); }
            });
        } else { StpUtil.logout(user.getId()); }
    }
}
