package com.unorva.mindforge.module.business.mail.support;

import com.unorva.mindforge.common.exception.BusinessErrorCode;
import com.unorva.mindforge.common.exception.BusinessException;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.SecureRandom;
import java.util.Base64;

import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;

/** Persistent AES-256-GCM encryption with owner and mailbox-bound authentication. */
@Service
public class MailCredentialCipher {
    private static final int IV_LENGTH = 12;
    private static final int TAG_LENGTH = 128;
    private static final SecureRandom RANDOM = new SecureRandom();
    private final String encryptionKey;

    public MailCredentialCipher(@Value("${mindforge.mail.encryption-key:}") String encryptionKey) {
        this.encryptionKey = encryptionKey;
    }

    public boolean configured() {
        try {
            key();
            return true;
        } catch (BusinessException exception) {
            return false;
        }
    }

    public String encrypt(long userId, String email, String plaintext) {
        try {
            byte[] iv = new byte[IV_LENGTH];
            RANDOM.nextBytes(iv);
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.ENCRYPT_MODE, key(), new GCMParameterSpec(TAG_LENGTH, iv));
            cipher.updateAAD(aad(userId, email));
            byte[] encrypted = cipher.doFinal(plaintext.getBytes(StandardCharsets.UTF_8));
            byte[] stored = new byte[iv.length + encrypted.length];
            System.arraycopy(iv, 0, stored, 0, iv.length);
            System.arraycopy(encrypted, 0, stored, iv.length, encrypted.length);
            return Base64.getEncoder().encodeToString(stored);
        } catch (GeneralSecurityException exception) {
            throw new BusinessException("邮箱凭据加密失败，请稍后重试", BusinessErrorCode.CONFLICT);
        }
    }

    public String decrypt(long userId, String email, String ciphertext) {
        SecretKeySpec secretKey = key();
        try {
            byte[] stored = Base64.getDecoder().decode(ciphertext);
            if (stored.length <= IV_LENGTH + TAG_LENGTH / 8) {
                throw new IllegalArgumentException("Invalid ciphertext");
            }
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.DECRYPT_MODE, secretKey, new GCMParameterSpec(TAG_LENGTH, stored, 0, IV_LENGTH));
            cipher.updateAAD(aad(userId, email));
            return new String(cipher.doFinal(stored, IV_LENGTH, stored.length - IV_LENGTH), StandardCharsets.UTF_8);
        } catch (GeneralSecurityException | IllegalArgumentException exception) {
            throw new BusinessException("邮箱凭据无法解密，请恢复原加密密钥或重新保存授权码", BusinessErrorCode.NOT_CONFIGURED);
        }
    }

    private SecretKeySpec key() {
        try {
            byte[] decoded = Base64.getDecoder().decode(encryptionKey == null ? "" : encryptionKey.trim());
            if (decoded.length != 32) {
                throw new IllegalArgumentException("Invalid key size");
            }
            return new SecretKeySpec(decoded, "AES");
        } catch (IllegalArgumentException exception) {
            throw new BusinessException(
                    "服务端邮箱凭据加密密钥未正确配置，请检查 mindforge.mail.encryption-key", BusinessErrorCode.NOT_CONFIGURED);
        }
    }

    private static byte[] aad(long userId, String email) {
        return (userId + "\n" + email).getBytes(StandardCharsets.UTF_8);
    }
}
