package com.unorva.mindforge.module.business.notes.controller;

import com.unorva.mindforge.common.security.support.CurrentUser;
import com.unorva.mindforge.common.web.form.IdForm;
import com.unorva.mindforge.common.web.vo.Result;
import com.unorva.mindforge.module.business.notes.domain.form.FolderIdForm;
import com.unorva.mindforge.module.business.notes.domain.form.FolderSaveForm;
import com.unorva.mindforge.module.business.notes.domain.form.NoteSaveForm;
import com.unorva.mindforge.module.business.notes.domain.form.NoteUpdateForm;
import com.unorva.mindforge.module.business.notes.domain.vo.NotesVO;
import com.unorva.mindforge.module.business.notes.service.NotesService;

import jakarta.validation.Valid;

import lombok.RequiredArgsConstructor;

import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

/** APIs compatible with the workspace note editor. */
@RestController
@RequiredArgsConstructor
public class NotesController {
    private final NotesService notesService;

    @GetMapping("/api/data/notes/NotesData")
    public Result<NotesVO> list() {
        return Result.success(notesService.list(CurrentUser.id()));
    }

    @PostMapping("/api/notes/add")
    public Result<NotesVO> create(@RequestBody @Valid NoteSaveForm param) {
        return Result.success(notesService.create(CurrentUser.id(), param));
    }

    @PutMapping("/api/notes/update")
    public Result<NotesVO> update(@RequestBody @Valid NoteUpdateForm param) {
        return Result.success(notesService.update(CurrentUser.id(), param));
    }

    @DeleteMapping("/api/notes/delete")
    public Result<NotesVO> delete(@RequestBody @Valid IdForm param) {
        return Result.success(notesService.delete(CurrentUser.id(), param.id()));
    }

    @PostMapping("/api/notes/folders/add")
    public Result<NotesVO> addFolder(@RequestBody @Valid FolderSaveForm param) {
        return Result.success(notesService.addFolder(CurrentUser.id(), param));
    }

    @DeleteMapping("/api/notes/folders/delete")
    public Result<NotesVO> deleteFolder(@RequestBody @Valid FolderIdForm param) {
        return Result.success(notesService.deleteFolder(CurrentUser.id(), param.id()));
    }
}
