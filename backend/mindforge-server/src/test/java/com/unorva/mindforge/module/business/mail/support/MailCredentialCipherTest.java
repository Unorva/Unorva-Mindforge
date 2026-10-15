package com.unorva.mindforge.module.business.mail.support;

import static org.junit.jupiter.api.Assertions.*;

import com.unorva.mindforge.common.exception.BusinessErrorCode;
import com.unorva.mindforge.common.exception.BusinessException;
import com.unorva.mindforge.module.business.mail.domain.bo.MailConnectionBO;

import org.junit.jupiter.api.Test;

import java.util.Arrays;
import java.util.Base64;

/** Credentials remain confidential and authenticated when stored or rendered in diagnostics. */
class MailCredentialCipherTest {
    private static final long USER = 7L;
    private static final String EMAIL = "mailbox@example.com";
    private static final String SECRET = "authorization-code-秘密";
    private static final String KEY = key((byte) 11);
    private final MailCredentialCipher cipher = new MailCredentialCipher(KEY);

    @Test
    void repeatedEncryptionUsesIndependentNoncesAndPreservesUnicodeCredentials() {
        String first = cipher.encrypt(USER, EMAIL, SECRET);
        String second = cipher.encrypt(USER, EMAIL, SECRET);

        assertNotEquals(first, second);
        assertFalse(Arrays.equals(nonce(first), nonce(second)));
        assertEquals(SECRET, cipher.decrypt(USER, EMAIL, first));
        assertEquals(SECRET, cipher.decrypt(USER, EMAIL, second));
        assertFalse(first.contains(SECRET));
        assertTrue(cipher.configured());
    }

    @Test
    void ciphertextCannotBeReusedByAnotherOwnerOrMailbox() {
        String stored = cipher.encrypt(USER, EMAIL, SECRET);

        assertSafeFailure(() -> cipher.decrypt(USER + 1, EMAIL, stored), stored);
        assertSafeFailure(() -> cipher.decrypt(USER, "other@example.com", stored), stored);
    }

    @Test
    void tamperingAndWrongKeysFailWithSafeConfigurationErrors() {
        String stored = cipher.encrypt(USER, EMAIL, SECRET);
        byte[] changed = Base64.getDecoder().decode(stored);
        changed[changed.length - 1] ^= 1;
        String tampered = Base64.getEncoder().encodeToString(changed);

        BusinessException authenticationFailure =
                assertSafeFailure(() -> cipher.decrypt(USER, EMAIL, tampered), tampered);
        BusinessException wrongKeyFailure =
                assertSafeFailure(
                        () -> new MailCredentialCipher(key((byte) 12)).decrypt(USER, EMAIL, stored),
                        stored);
        assertEquals(authenticationFailure.getMessage(), wrongKeyFailure.getMessage());
        assertSafeFailure(() -> cipher.decrypt(USER, EMAIL, "not-base64!"), "not-base64!");
        assertSafeFailure(
                () -> cipher.decrypt(USER, EMAIL, Base64.getEncoder().encodeToString(new byte[28])),
                stored);
    }

    @Test
    void invalidKeyConfigurationNeverProducesAUsableCredentialCipher() {
        for (String invalidKey :
                new String[] {
                    "", "not-base64!", Base64.getEncoder().encodeToString(new byte[16])
                }) {
            MailCredentialCipher invalid = new MailCredentialCipher(invalidKey);
            assertFalse(invalid.configured());
            BusinessException error =
                    assertThrows(
                            BusinessException.class, () -> invalid.encrypt(USER, EMAIL, SECRET));
            assertEquals(BusinessErrorCode.NOT_CONFIGURED, error.getErrorCode());
            assertFalse(error.getMessage().contains(SECRET));
        }
    }

    @Test
    void connectionDiagnosticsRedactTheCredential() {
        MailConnectionBO connection =
                new MailConnectionBO(
                        3L,
                        EMAIL,
                        "Mailbox",
                        EMAIL,
                        "imap.example.com",
                        993,
                        "ssl",
                        "smtp.example.com",
                        465,
                        "ssl",
                        SECRET,
                        "password");

        assertTrue(connection.toString().contains("REDACTED"));
        assertFalse(connection.toString().contains(SECRET));
        assertEquals(SECRET, connection.password());
    }

    private static BusinessException assertSafeFailure(
            org.junit.jupiter.api.function.Executable action, String stored) {
        BusinessException error = assertThrows(BusinessException.class, action);
        assertEquals(BusinessErrorCode.NOT_CONFIGURED, error.getErrorCode());
        assertFalse(error.getMessage().contains(SECRET));
        assertFalse(error.getMessage().contains(stored));
        assertFalse(error.getMessage().contains(KEY));
        return error;
    }

    private static byte[] nonce(String ciphertext) {
        return Arrays.copyOf(Base64.getDecoder().decode(ciphertext), 12);
    }

    private static String key(byte fill) {
        byte[] value = new byte[32];
        Arrays.fill(value, fill);
        return Base64.getEncoder().encodeToString(value);
    }
}
