package com.unorva.mindforge.module.business.notes.domain.bo;

import com.unorva.mindforge.module.business.notes.domain.vo.FolderVO;
import com.unorva.mindforge.module.business.notes.domain.vo.NoteVO;

import java.util.List;

/** One database snapshot, including inbox rows beyond the note list limit. */
public record NotesSnapshotBO(
        List<NoteVO> notes, List<FolderVO> folders, FolderVO createdFolder, long inboxNoteCount) {}
