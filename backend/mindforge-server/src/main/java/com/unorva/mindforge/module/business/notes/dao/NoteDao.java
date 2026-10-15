package com.unorva.mindforge.module.business.notes.dao;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.unorva.mindforge.module.business.notes.domain.entity.NoteEntity;
import com.unorva.mindforge.module.business.notes.domain.vo.NoteVO;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface NoteDao extends BaseMapper<NoteEntity> {
    List<NoteVO> listNotes(@Param("userId") long userId);

    NoteVO findNote(@Param("userId") long userId, @Param("id") long id);

    long countByFolder(@Param("userId") long userId, @Param("folderId") String folderId);

    int insertNote(@Param("entity") NoteEntity entity);

    int updateNote(@Param("entity") NoteEntity entity);

    int deleteNote(@Param("userId") long userId, @Param("id") long id);

    int deleteByFolder(@Param("userId") long userId, @Param("folderId") String folderId);
}
