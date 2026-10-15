package com.unorva.mindforge.module.business.notes.service;

import static org.junit.jupiter.api.Assertions.assertEquals;

import com.unorva.mindforge.module.business.notes.domain.vo.FolderVO;
import com.unorva.mindforge.module.business.notes.manager.NotesManager;

import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Set;

/** Folder deletion must include descendants and terminate even for malformed legacy trees. */
class NotesRulesTest {
    @Test
    void subtreeIncludesNestedFoldersWithoutAffectingSiblingFolders() {
        List<FolderVO> folders =
                List.of(
                        new FolderVO("work", "工作", null),
                        new FolderVO("projects", "项目", "work"),
                        new FolderVO("release", "交付", "projects"),
                        new FolderVO("personal", "个人", null));
        assertEquals(
                Set.of("work", "projects", "release"), NotesManager.descendantIds(folders, "work"));
    }

    @Test
    void malformedLegacyFolderCycleDoesNotLoopForever() {
        List<FolderVO> folders = List.of(new FolderVO("a", "A", "b"), new FolderVO("b", "B", "a"));
        assertEquals(Set.of("a", "b"), NotesManager.descendantIds(folders, "a"));
    }
}
