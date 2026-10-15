package com.unorva.mindforge.module.business.notes.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.unorva.mindforge.common.datasource.manager.BusinessLockManager;
import com.unorva.mindforge.common.exception.BusinessErrorCode;
import com.unorva.mindforge.common.exception.BusinessException;
import com.unorva.mindforge.module.business.notes.dao.NoteDao;
import com.unorva.mindforge.module.business.notes.dao.NoteFolderDao;
import com.unorva.mindforge.module.business.notes.domain.entity.NoteFolderEntity;
import com.unorva.mindforge.module.business.notes.domain.form.FolderSaveForm;
import com.unorva.mindforge.module.business.notes.domain.form.NoteSaveForm;
import com.unorva.mindforge.module.business.notes.domain.vo.FolderVO;
import com.unorva.mindforge.module.business.notes.domain.vo.NoteVO;
import com.unorva.mindforge.module.business.notes.domain.vo.NotesVO;
import com.unorva.mindforge.module.business.notes.manager.NotesManager;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Baseline: no default folder, populated legacy inboxes stay visible and subtree deletion stays
 * scoped.
 */
class NotesEmptyStateTest {
    private final NoteDao noteDao = mock(NoteDao.class);
    private final NoteFolderDao folderDao = mock(NoteFolderDao.class);
    private final BusinessLockManager lockManager = mock(BusinessLockManager.class);
    private final NotesService service =
            new NotesService(new NotesManager(noteDao, folderDao, lockManager));
    private final List<FolderVO> folders = new ArrayList<>();
    private final List<NoteVO> notes = new ArrayList<>();

    @BeforeEach
    void setUp() {
        when(folderDao.listFolders(7L)).thenAnswer(unused -> List.copyOf(folders));
        when(noteDao.listNotes(7L)).thenAnswer(unused -> List.copyOf(notes));
    }

    @Test
    void newUserSeesNoFoldersAndListingDoesNotWriteToDatabase() {
        NotesVO result = service.list(7L);
        assertTrue(result.folders().isEmpty());
        assertTrue(result.notes().isEmpty());
        verify(noteDao).listNotes(7L);
        verify(folderDao).listFolders(7L);
        verifyNoMoreInteractions(noteDao, folderDao);
        verifyNoInteractions(lockManager);
    }

    @Test
    void creatingNoteWithoutExplicitFolderFailsBeforeWritingAnything() {
        BusinessException exception =
                assertThrows(
                        BusinessException.class,
                        () ->
                                service.create(
                                        7L,
                                        new NoteSaveForm(
                                                null, "新笔记", "内容", "primary", null, false)));
        assertEquals(BusinessErrorCode.INVALID_INPUT, exception.getErrorCode());
        assertThrows(
                BusinessException.class,
                () ->
                        service.create(
                                7L, new NoteSaveForm(null, "新笔记", "内容", "primary", "  ", false)));
        verifyNoInteractions(noteDao, folderDao, lockManager);
    }

    @Test
    void emptyLegacyInboxIsHiddenWithoutDeletingItsStoredRow() {
        folders.add(new FolderVO("inbox", "收件箱", null));
        assertTrue(service.list(7L).folders().isEmpty());
        assertEquals(List.of(new FolderVO("inbox", "收件箱", null)), folders);
        verifyNoInteractions(lockManager);
        verify(folderDao, never()).deleteFolder(anyLong(), anyString());
    }

    @Test
    void populatedLegacyInboxRetainsIdentifierAndExistingNoteContent() {
        folders.add(new FolderVO("inbox", "收件箱", null));
        NoteVO storedNote =
                new NoteVO(11L, "旧笔记", "需要保留的内容", "primary", "inbox", LocalDateTime.now(), false);
        notes.add(storedNote);
        when(noteDao.countByFolder(7L, "inbox")).thenReturn(1L);
        NotesVO result = service.list(7L);
        assertEquals(List.of(new FolderVO("inbox", "未分类笔记", null)), result.folders());
        assertEquals(List.of(storedNote), result.notes());
        verifyNoInteractions(lockManager);
    }

    @Test
    void legacyInboxWithChildrenRemainsAccessibleEvenWithoutDirectNotes() {
        folders.add(new FolderVO("inbox", "收件箱", null));
        folders.add(new FolderVO("child", "旧子目录", "inbox"));
        assertEquals(
                List.of(
                        new FolderVO("inbox", "未分类笔记", null),
                        new FolderVO("child", "旧子目录", "inbox")),
                service.list(7L).folders());
    }

    @Test
    void legacyInboxIsKeptWhenItsNotesAreOutsideTheReturnedNoteWindow() {
        folders.add(new FolderVO("inbox", "收件箱", null));
        when(noteDao.countByFolder(7L, "inbox")).thenReturn(1L);
        NotesVO result = service.list(7L);
        assertTrue(result.notes().isEmpty());
        assertEquals(List.of(new FolderVO("inbox", "未分类笔记", null)), result.folders());
    }

    @Test
    void creatingFirstFolderCreatesOnlyTheRequestedFolderAndPreservesModuleLock() {
        when(folderDao.insertFolder(any(NoteFolderEntity.class)))
                .thenAnswer(
                        invocation -> {
                            NoteFolderEntity entity = invocation.getArgument(0);
                            folders.add(
                                    new FolderVO(
                                            entity.getId(),
                                            entity.getName(),
                                            entity.getParentId()));
                            return 1;
                        });
        NotesVO result = service.addFolder(7L, new FolderSaveForm("工作", null));
        assertEquals(1, result.folders().size());
        assertEquals("工作", result.folders().getFirst().name());
        assertNotEquals("inbox", result.folders().getFirst().id());
        assertEquals(result.folder(), result.folders().getFirst());
        verify(lockManager).lock(7L, "notes");
    }

    @Test
    void deletingLegacyInboxUsesNormalSubtreeDeletionWithoutRecreatingIt() {
        folders.add(new FolderVO("inbox", "收件箱", null));
        folders.add(new FolderVO("child", "子目录", "inbox"));
        notes.add(new NoteVO(1L, "笔记", "内容", "primary", "child", LocalDateTime.now(), false));
        when(folderDao.countFolder(7L, "inbox")).thenReturn(1L);
        when(folderDao.deleteFolder(eq(7L), anyString()))
                .thenAnswer(
                        invocation -> {
                            String folderId = invocation.getArgument(1);
                            folders.removeIf(folder -> folderId.equals(folder.id()));
                            return 1;
                        });
        when(noteDao.deleteByFolder(eq(7L), anyString()))
                .thenAnswer(
                        invocation -> {
                            String folderId = invocation.getArgument(1);
                            notes.removeIf(note -> folderId.equals(note.folderId()));
                            return 1;
                        });
        NotesVO result = service.deleteFolder(7L, "inbox");
        assertTrue(result.folders().isEmpty());
        assertTrue(result.notes().isEmpty());
        var order = inOrder(lockManager, folderDao, noteDao);
        order.verify(lockManager).lock(7L, "notes");
        order.verify(folderDao).countFolder(7L, "inbox");
        order.verify(folderDao).listFolders(7L);
        verify(noteDao).deleteByFolder(7L, "child");
        verify(folderDao).deleteFolder(7L, "child");
    }
}
