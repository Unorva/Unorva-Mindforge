package com.unorva.mindforge.module.business.notes.dao;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.unorva.mindforge.module.business.notes.domain.entity.NoteFolderEntity;
import com.unorva.mindforge.module.business.notes.domain.vo.FolderVO;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface NoteFolderDao extends BaseMapper<NoteFolderEntity> {
    List<FolderVO> listFolders(@Param("userId") long userId);

    long countFolder(@Param("userId") long userId, @Param("id") String id);

    int insertFolder(@Param("entity") NoteFolderEntity entity);

    int deleteFolder(@Param("userId") long userId, @Param("id") String id);
}
