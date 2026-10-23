package com.unorva.mindforge.module.business.ai.manager;

import com.unorva.mindforge.common.exception.BusinessErrorCode;
import com.unorva.mindforge.common.exception.BusinessException;
import com.unorva.mindforge.module.business.ai.dao.AiCredentialDao;
import com.unorva.mindforge.module.business.ai.domain.bo.ProviderCredentialBO;
import com.unorva.mindforge.module.business.ai.domain.entity.AiCredentialEntity;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.SecureRandom;
import java.util.Base64;

import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;

/** Encrypts user-supplied provider keys with a persistent server AES-256 key. */
@Component
public class AiCredentialManager {
    private static final int IV_LENGTH = 12;
    private static final int GCM_TAG_LENGTH = 128;
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();
    private final AiCredentialDao credentialDao;
    private final String encryptionKey;

    public AiCredentialManager(
            AiCredentialDao credentialDao, @Value("${mindforge.ai.encryption-key:}") String encryptionKey) {
        this.credentialDao = credentialDao;
        this.encryptionKey = encryptionKey;
    }

    /** Blank submitted keys retain the existing encrypted credential. */
    public void save(long userId, String baseUrl, String submittedKey) {
        AiCredentialEntity current = stored(userId);
        String normalizedUrl = normalizeBaseUrl(StringUtils.hasText(baseUrl) ? baseUrl : current.getBaseUrl());
        String ciphertext = current.getApiKeyCiphertext();
        if (StringUtils.hasText(ciphertext)
                && !normalizedUrl.equals(normalizeBaseUrl(current.getBaseUrl()))
                && !StringUtils.hasText(submittedKey)) {
            throw new BusinessException("接口地址已更改，请填写该服务商对应的 API Key", BusinessErrorCode.INVALID_INPUT);
        }
        if (StringUtils.hasText(submittedKey)) {
            if (submittedKey.indexOf('\n') >= 0 || submittedKey.indexOf('\r') >= 0) {
                throw new BusinessException("API Key 不能包含换行", BusinessErrorCode.INVALID_INPUT);
            }
            ciphertext = encrypt(userId, submittedKey.trim());
        }
        credentialDao.save(userId, normalizedUrl, ciphertext);
    }

    public boolean configured(long userId) {
        AiCredentialEntity value = stored(userId);
        return StringUtils.hasText(value.getBaseUrl())
                && StringUtils.hasText(value.getApiKeyCiphertext())
                && StringUtils.hasText(encryptionKey);
    }

    public String baseUrl(long userId) {
        return stored(userId).getBaseUrl();
    }

    public ProviderCredentialBO requireCredential(long userId) {
        AiCredentialEntity value = stored(userId);
        if (!StringUtils.hasText(value.getBaseUrl()) || !StringUtils.hasText(value.getApiKeyCiphertext())) {
            throw new BusinessException("请先在账户设置中保存 AI 接口地址、模型和 API Key", BusinessErrorCode.NOT_CONFIGURED);
        }
        return new ProviderCredentialBO(
                normalizeBaseUrl(value.getBaseUrl()), decrypt(userId, value.getApiKeyCiphertext()));
    }

    public void remove(long userId) {
        credentialDao.remove(userId);
    }

    private AiCredentialEntity stored(long userId) {
        AiCredentialEntity value = credentialDao.find(userId);
        if (value != null) return value;
        value = new AiCredentialEntity();
        value.setUserId(userId);
        value.setBaseUrl("");
        return value;
    }

    /** Validates destinations and preserves a user-selected local compatible endpoint. */
    public static String normalizeBaseUrl(String rawUrl) {
        if (!StringUtils.hasText(rawUrl)) {
            return "";
        }
        try {
            URI uri = URI.create(rawUrl.trim());
            if (!("https".equalsIgnoreCase(uri.getScheme()) || "http".equalsIgnoreCase(uri.getScheme()))
                    || uri.getHost() == null
                    || uri.getRawUserInfo() != null
                    || uri.getRawQuery() != null
                    || uri.getRawFragment() != null
                    || uri.getPort() > 65535
                    || uri.getPort() == 0) {
                throw new IllegalArgumentException("Unsupported endpoint");
            }
            String normalized = uri.toASCIIString();
            while (normalized.endsWith("/")) {
                normalized = normalized.substring(0, normalized.length() - 1);
            }
            return normalized;
        } catch (IllegalArgumentException exception) {
            throw new BusinessException("AI 接口地址必须是有效的 HTTP/HTTPS 地址，不能包含密码、查询参数或锚点", BusinessErrorCode.INVALID_INPUT);
        }
    }

    private SecretKeySpec secretKey() {
        try {
            byte[] key = Base64.getDecoder().decode(encryptionKey);
            if (key.length != 32) {
                throw new IllegalArgumentException("Invalid encryption key size");
            }
            return new SecretKeySpec(key, "AES");
        } catch (IllegalArgumentException exception) {
            throw new BusinessException(
                    "服务端 AI 凭据加密密钥未正确配置，请检查 mindforge.ai.encryption-key", BusinessErrorCode.NOT_CONFIGURED);
        }
    }

    private String encrypt(long userId, String plaintext) {
        try {
            byte[] iv = new byte[IV_LENGTH];
            SECURE_RANDOM.nextBytes(iv);
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.ENCRYPT_MODE, secretKey(), new GCMParameterSpec(GCM_TAG_LENGTH, iv));
            cipher.updateAAD(Long.toString(userId).getBytes(StandardCharsets.UTF_8));
            byte[] encrypted = cipher.doFinal(plaintext.getBytes(StandardCharsets.UTF_8));
            byte[] stored = new byte[iv.length + encrypted.length];
            System.arraycopy(iv, 0, stored, 0, iv.length);
            System.arraycopy(encrypted, 0, stored, iv.length, encrypted.length);
            return Base64.getEncoder().encodeToString(stored);
        } catch (GeneralSecurityException exception) {
            throw new BusinessException("AI 凭据加密失败", BusinessErrorCode.CONFLICT);
        }
    }

    private String decrypt(long userId, String ciphertext) {
        try {
            byte[] stored = Base64.getDecoder().decode(ciphertext);
            if (stored.length <= IV_LENGTH) {
                throw new IllegalArgumentException("Invalid ciphertext");
            }
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.DECRYPT_MODE, secretKey(), new GCMParameterSpec(GCM_TAG_LENGTH, stored, 0, IV_LENGTH));
            cipher.updateAAD(Long.toString(userId).getBytes(StandardCharsets.UTF_8));
            return new String(cipher.doFinal(stored, IV_LENGTH, stored.length - IV_LENGTH), StandardCharsets.UTF_8);
        } catch (GeneralSecurityException | IllegalArgumentException exception) {
            throw new BusinessException("AI 凭据无法解密，请恢复原加密密钥或重新保存 API Key", BusinessErrorCode.NOT_CONFIGURED);
        }
    }
}
