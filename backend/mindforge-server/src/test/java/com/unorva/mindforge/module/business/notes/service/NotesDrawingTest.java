package com.unorva.mindforge.module.business.notes.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.unorva.mindforge.common.datasource.manager.BusinessLockManager;
import com.unorva.mindforge.module.business.notes.dao.NoteDao;
import com.unorva.mindforge.module.business.notes.dao.NoteFolderDao;
import com.unorva.mindforge.module.business.notes.domain.entity.NoteEntity;
import com.unorva.mindforge.module.business.notes.domain.form.NoteSaveForm;
import com.unorva.mindforge.module.business.notes.domain.form.NoteUpdateForm;
import com.unorva.mindforge.module.business.notes.domain.vo.FolderVO;
import com.unorva.mindforge.module.business.notes.domain.vo.NoteVO;
import com.unorva.mindforge.module.business.notes.manager.NotesManager;

import jakarta.validation.Validation;

import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.List;
import java.util.concurrent.atomic.AtomicReference;

/** Drawing scenes use the existing note content column and retain embedded image data verbatim. */
class NotesDrawingTest {
    @Test
    void drawingWithEmbeddedImageSurvivesCreateReadAndUpdate() {
        NoteDao noteDao = mock(NoteDao.class);
        NoteFolderDao folderDao = mock(NoteFolderDao.class);
        BusinessLockManager lockManager = mock(BusinessLockManager.class);
        NotesService service = new NotesService(new NotesManager(noteDao, folderDao, lockManager));
        AtomicReference<NoteVO> stored = new AtomicReference<>();
        LocalDateTime updatedAt = LocalDateTime.of(2026, 10, 22, 12, 0);
        when(folderDao.countFolder(7L, "work")).thenReturn(1L);
        when(folderDao.listFolders(7L)).thenReturn(List.of(new FolderVO("work", "工作", null)));
        when(noteDao.listNotes(7L)).thenAnswer(unused -> List.of(stored.get()));
        when(noteDao.findNote(7L, 11L)).thenAnswer(unused -> stored.get());
        when(noteDao.insertNote(any(NoteEntity.class)))
                .thenAnswer(
                        invocation -> {
                            NoteEntity entity = invocation.getArgument(0);
                            assertEquals(7L, entity.getUserId());
                            stored.set(
                                    new NoteVO(
                                            11L,
                                            entity.getTitle(),
                                            entity.getContent(),
                                            entity.getColor(),
                                            entity.getFolderId(),
                                            updatedAt,
                                            false));
                            return 1;
                        });
        when(noteDao.updateNote(any(NoteEntity.class)))
                .thenAnswer(
                        invocation -> {
                            NoteEntity entity = invocation.getArgument(0);
                            assertEquals(7L, entity.getUserId());
                            assertEquals(11L, entity.getId());
                            stored.set(
                                    new NoteVO(
                                            entity.getId(),
                                            entity.getTitle(),
                                            entity.getContent(),
                                            entity.getColor(),
                                            entity.getFolderId(),
                                            updatedAt,
                                            entity.getDeleted()));
                            return 1;
                        });

        String original = drawingScene("草图", 250_000);
        var created =
                service.create(
                        7L, new NoteSaveForm(null, "流程图.excalidraw", original, "primary", "work", false));
        assertEquals("流程图.excalidraw", created.notes().getFirst().title());
        assertEquals(original, created.notes().getFirst().content());
        assertEquals(original, service.list(7L).notes().getFirst().content());

        String changed = drawingScene("修改后的草图", 300_000);
        var updated =
                service.update(7L, new NoteUpdateForm(11L, null, changed, null, null, null));
        assertEquals("流程图.excalidraw", updated.notes().getFirst().title());
        assertEquals(changed, updated.notes().getFirst().content());
        assertEquals(changed, service.list(7L).notes().getFirst().content());
        verify(lockManager, times(2)).lock(7L, "notes");
    }

    @Test
    void createAndUpdateAcceptScenesAboveTheFormerMarkdownLimit() {
        String scene = drawingScene("含中文与图片的绘图", 250_000);
        try (var factory = Validation.buildDefaultValidatorFactory()) {
            var validator = factory.getValidator();
            assertTrue(
                    validator
                            .validate(new NoteSaveForm(null, "绘图.excalidraw", scene, "primary", "work", false))
                            .isEmpty());
            assertTrue(
                    validator
                            .validate(new NoteUpdateForm(11L, null, scene, null, null, null))
                            .isEmpty());
        }
    }

    @Test
    void createAndUpdateEnforceTheSameMediumTextSafeBoundary() {
        // Even four-byte UTF-8 characters stay below MEDIUMTEXT's 16,777,215 byte capacity.
        String maximum = "x".repeat(4_000_000);
        String oversized = maximum + "x";
        try (var factory = Validation.buildDefaultValidatorFactory()) {
            var validator = factory.getValidator();
            assertTrue(
                    validator
                            .validate(new NoteSaveForm(null, "绘图.excalidraw", maximum, "primary", "work", false))
                            .isEmpty());
            assertTrue(
                    validator
                            .validate(new NoteUpdateForm(11L, null, maximum, null, null, null))
                            .isEmpty());
            assertEquals(
                    "content",
                    validator
                            .validate(new NoteSaveForm(null, "绘图.excalidraw", oversized, "primary", "work", false))
                            .iterator()
                            .next()
                            .getPropertyPath()
                            .toString());
            assertEquals(
                    "content",
                    validator
                            .validate(new NoteUpdateForm(11L, null, oversized, null, null, null))
                            .iterator()
                            .next()
                            .getPropertyPath()
                            .toString());
        }
    }

    private static String drawingScene(String text, int imageLength) {
        return """
                {"type":"excalidraw","version":2,"source":"https://excalidraw.com",\
                "elements":[{"type":"text","text":"%s"}],"appState":{"viewBackgroundColor":"#ffffff"},\
                "files":{"image":{"id":"image","mimeType":"image/png","dataURL":"data:image/png;base64,%s","created":1}}}
                """
                .formatted(text, "A".repeat(imageLength));
    }
}
