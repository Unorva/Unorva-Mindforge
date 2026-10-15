package com.unorva.mindforge.module.business.projectmanager.dao;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.unorva.mindforge.module.business.projectmanager.domain.entity.ProjectEntity;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import java.util.List;
@Mapper
public interface ProjectDao extends BaseMapper<ProjectEntity> {
    List<ProjectEntity> selectOwnedList(@Param("userId") long userId);
    ProjectEntity selectOwned(@Param("userId") long userId, @Param("projectId") Long projectId, @Param("lock") boolean lock);
}
