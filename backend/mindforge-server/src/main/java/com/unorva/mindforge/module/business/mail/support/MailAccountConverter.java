package com.unorva.mindforge.module.business.mail.support;

import com.unorva.mindforge.common.exception.BusinessErrorCode;
import com.unorva.mindforge.common.exception.BusinessException;
import com.unorva.mindforge.module.business.mail.domain.bo.MailConnectionBO;
import com.unorva.mindforge.module.business.mail.domain.entity.MailAccountEntity;
import com.unorva.mindforge.module.business.mail.domain.vo.MailAccountVO;
import org.springframework.util.StringUtils;

/** Pure entity conversion shared by mailbox workflows without manager dependencies. */
public final class MailAccountConverter {
    private MailAccountConverter() {}

    public static MailAccountVO toVO(MailAccountEntity entity, boolean cipherConfigured) {
        return new MailAccountVO(entity.getId(), entity.getProvider(), entity.getEmail(), entity.getDisplayName(),
                entity.getUsername(), entity.getImapHost(), entity.getImapPort(), entity.getImapSecurity(),
                entity.getSmtpHost(), entity.getSmtpPort(), entity.getSmtpSecurity(), Boolean.TRUE.equals(entity.getEnabled()),
                Boolean.TRUE.equals(entity.getDefaultAccount()), StringUtils.hasText(entity.getPasswordCiphertext()) && cipherConfigured,
                entity.getStatus(), entity.getLastError(), entity.getLastSyncAt(), entity.getCreatedAt(), entity.getUpdatedAt(), entity.getAuthType());
    }

    public static MailConnectionBO connection(MailAccountEntity entity, MailCredentialCipher cipher) {
        if (!Boolean.TRUE.equals(entity.getEnabled())) {
            throw new BusinessException("请先启用该邮箱账户", BusinessErrorCode.CONFLICT);
        }
        if (!StringUtils.hasText(entity.getPasswordCiphertext())) {
            throw new BusinessException("请先为该邮箱保存授权码或 OAuth2 访问令牌", BusinessErrorCode.NOT_CONFIGURED);
        }
        return new MailConnectionBO(entity.getId(), entity.getEmail(), entity.getDisplayName(), entity.getUsername(),
                entity.getImapHost(), entity.getImapPort(), entity.getImapSecurity(), entity.getSmtpHost(), entity.getSmtpPort(),
                entity.getSmtpSecurity(), cipher.decrypt(entity.getUserId(), entity.getEmail(), entity.getPasswordCiphertext()), entity.getAuthType());
    }
}
