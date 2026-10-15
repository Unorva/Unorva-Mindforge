package com.unorva.mindforge.module.business.notes.manager;

import com.unorva.mindforge.common.datasource.manager.BusinessLockManager;
import com.unorva.mindforge.common.datasource.support.DaoSupport;
import com.unorva.mindforge.common.exception.BusinessErrorCode;
import com.unorva.mindforge.common.exception.BusinessException;
import com.unorva.mindforge.module.business.notes.dao.NoteDao;
import com.unorva.mindforge.module.business.notes.dao.NoteFolderDao;
import com.unorva.mindforge.module.business.notes.domain.bo.NotesSnapshotBO;
import com.unorva.mindforge.module.business.notes.domain.entity.NoteEntity;
import com.unorva.mindforge.module.business.notes.domain.entity.NoteFolderEntity;
import com.unorva.mindforge.module.business.notes.domain.form.FolderSaveForm;
import com.unorva.mindforge.module.business.notes.domain.form.NoteSaveForm;
import com.unorva.mindforge.module.business.notes.domain.form.NoteUpdateForm;
import com.unorva.mindforge.module.business.notes.domain.vo.FolderVO;
import com.unorva.mindforge.module.business.notes.domain.vo.NoteVO;

import lombok.RequiredArgsConstructor;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

/** Transaction boundary for mutations spanning notes and their folder tree. */
@Service
@RequiredArgsConstructor
public class NotesManager {
    private final NoteDao noteDao;
    private final NoteFolderDao folderDao;
    private final BusinessLockManager lockManager;

    @Transactional(readOnly = true)
    public NotesSnapshotBO snapshot(long userId) {
        return snapshot(userId, null);
    }

    @Transactional(rollbackFor = Exception.class)
    public NotesSnapshotBO create(long userId, NoteSaveForm form) {
        lockManager.lock(userId, "notes");
        String folderId = form.folderId().trim();
        requireFolder(userId, folderId);
        NoteEntity entity = new NoteEntity();
        entity.setUserId(userId);
        entity.setFolderId(folderId);
        entity.setTitle(form.title().trim());
        entity.setContent(value(form.content(), ""));
        entity.setColor(value(form.color(), "primary"));
        noteDao.insertNote(entity);
        return snapshot(userId, null);
    }

    @Transactional(rollbackFor = Exception.class)
    public NotesSnapshotBO update(long userId, NoteUpdateForm form) {
        lockManager.lock(userId, "notes");
        NoteVO current = noteDao.findNote(userId, form.id());
        if (current == null) {
            throw new BusinessException(BusinessErrorCode.NOT_FOUND);
        }
        String folderId = value(form.folderId(), current.folderId());
        requireFolder(userId, folderId);
        String title = value(form.title(), current.title()).trim();
        if (!StringUtils.hasText(title)) {
            throw new BusinessException("笔记标题不能为空", BusinessErrorCode.INVALID_INPUT);
        }
        NoteEntity entity = new NoteEntity();
        entity.setId(form.id());
        entity.setUserId(userId);
        entity.setTitle(title);
        entity.setContent(value(form.content(), current.content()));
        entity.setColor(value(form.color(), current.color()));
        entity.setFolderId(folderId);
        entity.setDeleted(form.deleted() == null ? current.deleted() : form.deleted());
        DaoSupport.requireChanged(noteDao.updateNote(entity));
        return snapshot(userId, null);
    }

    @Transactional(rollbackFor = Exception.class)
    public NotesSnapshotBO delete(long userId, long id) {
        lockManager.lock(userId, "notes");
        DaoSupport.requireChanged(noteDao.deleteNote(userId, id));
        return snapshot(userId, null);
    }

    @Transactional(rollbackFor = Exception.class)
    public NotesSnapshotBO addFolder(long userId, FolderSaveForm form) {
        lockManager.lock(userId, "notes");
        String parentId = StringUtils.hasText(form.parentId()) ? form.parentId().trim() : null;
        if (parentId != null) {
            requireFolder(userId, parentId);
        }
        NoteFolderEntity entity = new NoteFolderEntity();
        entity.setId(UUID.randomUUID().toString());
        entity.setUserId(userId);
        entity.setName(form.name().trim());
        entity.setParentId(parentId);
        folderDao.insertFolder(entity);
        return snapshot(userId, new FolderVO(entity.getId(), entity.getName(), parentId));
    }

    @Transactional(rollbackFor = Exception.class)
    public NotesSnapshotBO deleteFolder(long userId, String id) {
        lockManager.lock(userId, "notes");
        requireFolder(userId, id);
        for (String folderId : descendantIds(folderDao.listFolders(userId), id)) {
            noteDao.deleteByFolder(userId, folderId);
            folderDao.deleteFolder(userId, folderId);
        }
        return snapshot(userId, null);
    }

    /** Resolves descendants iteratively, including the root, even for legacy cycles. */
    public static Set<String> descendantIds(List<FolderVO> folders, String rootId) {
        Set<String> descendants = new HashSet<>();
        descendants.add(rootId);
        boolean changed;
        do {
            changed = false;
            for (FolderVO folder : folders) {
                if (folder.parentId() != null && descendants.contains(folder.parentId())) {
                    changed |= descendants.add(folder.id());
                }
            }
        } while (changed);
        return descendants;
    }

    private NotesSnapshotBO snapshot(long userId, FolderVO createdFolder) {
        List<NoteVO> notes = noteDao.listNotes(userId);
        List<FolderVO> folders = folderDao.listFolders(userId);
        long inboxNoteCount =
                folders.stream().anyMatch(folder -> "inbox".equals(folder.id()))
                        ? noteDao.countByFolder(userId, "inbox")
                        : 0;
        return new NotesSnapshotBO(notes, folders, createdFolder, inboxNoteCount);
    }

    private void requireFolder(long userId, String id) {
        DaoSupport.requireExists(folderDao.countFolder(userId, id));
    }

    private static String value(String supplied, String fallback) {
        return supplied == null ? fallback : supplied;
    }
}
