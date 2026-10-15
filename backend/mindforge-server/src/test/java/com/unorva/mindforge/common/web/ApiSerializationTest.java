package com.unorva.mindforge.common.web;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.unorva.mindforge.module.business.mail.domain.bo.MailConnectionBO;
import com.unorva.mindforge.module.business.mail.domain.form.MailAccountSaveForm;
import com.unorva.mindforge.module.business.notes.domain.vo.FolderVO;
import com.unorva.mindforge.module.business.notes.domain.vo.NoteVO;
import com.unorva.mindforge.module.business.notes.domain.vo.NotesVO;
import com.unorva.mindforge.module.system.settings.domain.dto.AppOptionsDTO;

import org.junit.jupiter.api.Test;

import tools.jackson.databind.json.JsonMapper;

import java.time.LocalDateTime;
import java.util.List;

/** Frontend JSON contracts and credential boundaries must survive the package/model split. */
class ApiSerializationTest {
    private final JsonMapper objectMapper = JsonMapper.builder().build();

    @Test
    void applicationNotificationPropertyRetainsItsFrontendName() {
        var json = objectMapper.readTree(objectMapper.writeValueAsString(new AppOptionsDTO("手动", true, false)));
        assertTrue(json.get("notify").asBoolean());
        assertFalse(json.has("notifyEnabled"));
        assertEquals(new AppOptionsDTO("手动", true, false), objectMapper.treeToValue(json, AppOptionsDTO.class));
    }

    @Test
    void mailboxPasswordIsAcceptedAsInputAndOmittedFromSerializedOutput() {
        MailAccountSaveForm input =
                objectMapper.readValue(
                        "{\"provider\":\"custom\",\"email\":\"test@example.invalid\",\"password\":\"private-secret\"}",
                        MailAccountSaveForm.class);
        assertEquals("private-secret", input.password());
        var output = objectMapper.readTree(objectMapper.writeValueAsString(input));
        assertFalse(output.has("password"));
        assertFalse(input.toString().contains("private-secret"));

        MailConnectionBO connection =
                new MailConnectionBO(
                        1L,
                        "test@example.invalid",
                        "Test",
                        "test",
                        "imap.example.invalid",
                        993,
                        "ssl",
                        "smtp.example.invalid",
                        465,
                        "ssl",
                        "transport-secret",
                        "password");
        assertFalse(objectMapper.writeValueAsString(connection).contains("transport-secret"));
        assertFalse(connection.toString().contains("transport-secret"));
    }

    @Test
    void notesKeepTheirDateAndFolderResponseProperties() {
        FolderVO folder = new FolderVO("work", "Work", null);
        NoteVO note = new NoteVO(1L, "Title", "Content", "blue", "work", LocalDateTime.of(2026, 10, 9, 9, 30), false);
        var json =
                objectMapper.readTree(
                        objectMapper.writeValueAsString(new NotesVO(List.of(note), List.of(folder), folder)));
        assertEquals("work", json.get("folder").get("id").asString());
        assertTrue(json.get("notes").get(0).has("datef"));
        assertEquals("work", json.get("notes").get(0).get("folderId").asString());
    }
}
