package com.unorva.mindforge.module.business.notes.service;

import com.unorva.mindforge.common.exception.BusinessErrorCode;
import com.unorva.mindforge.common.exception.BusinessException;
import com.unorva.mindforge.module.business.notes.domain.bo.NotesSnapshotBO;
import com.unorva.mindforge.module.business.notes.domain.form.FolderSaveForm;
import com.unorva.mindforge.module.business.notes.domain.form.NoteSaveForm;
import com.unorva.mindforge.module.business.notes.domain.form.NoteUpdateForm;
import com.unorva.mindforge.module.business.notes.domain.vo.FolderVO;
import com.unorva.mindforge.module.business.notes.domain.vo.NotesVO;
import com.unorva.mindforge.module.business.notes.manager.NotesManager;

import lombok.RequiredArgsConstructor;

import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.List;

/** Note input rules and frontend snapshots; owner identity is supplied by the controller. */
@Service
@RequiredArgsConstructor
public class NotesService {
    private static final String INBOX_ID = "inbox";
    private final NotesManager manager;

    public NotesVO list(long userId) {
        return present(manager.snapshot(userId));
    }

    public NotesVO create(long userId, NoteSaveForm form) {
        if (!StringUtils.hasText(form.folderId())) {
            throw new BusinessException("请先创建并选择笔记所属文件夹", BusinessErrorCode.INVALID_INPUT);
        }
        return present(manager.create(userId, form));
    }

    public NotesVO update(long userId, NoteUpdateForm form) {
        return present(manager.update(userId, form));
    }

    public NotesVO delete(long userId, long id) {
        return present(manager.delete(userId, id));
    }

    public NotesVO addFolder(long userId, FolderSaveForm form) {
        return present(manager.addFolder(userId, form));
    }

    public NotesVO deleteFolder(long userId, String id) {
        return present(manager.deleteFolder(userId, id));
    }

    private NotesVO present(NotesSnapshotBO snapshot) {
        List<FolderVO> folders = snapshot.folders();
        boolean keepLegacyInbox =
                snapshot.inboxNoteCount() > 0
                        || folders.stream().anyMatch(folder -> INBOX_ID.equals(folder.parentId()));
        List<FolderVO> visibleFolders =
                folders.stream()
                        .filter(folder -> !INBOX_ID.equals(folder.id()) || keepLegacyInbox)
                        .map(
                                folder ->
                                        INBOX_ID.equals(folder.id())
                                                ? new FolderVO(
                                                        folder.id(), "未分类笔记", folder.parentId())
                                                : folder)
                        .toList();
        return new NotesVO(snapshot.notes(), visibleFolders, snapshot.createdFolder());
    }
}
