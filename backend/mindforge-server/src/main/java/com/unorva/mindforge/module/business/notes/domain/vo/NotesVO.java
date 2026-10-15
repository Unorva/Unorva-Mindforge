package com.unorva.mindforge.module.business.notes.domain.vo;

import java.util.List;

public record NotesVO(List<NoteVO> notes, List<FolderVO> folders, FolderVO folder) {}
