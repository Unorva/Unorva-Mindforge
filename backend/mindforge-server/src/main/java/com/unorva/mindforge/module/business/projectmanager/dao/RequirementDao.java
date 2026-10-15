package com.unorva.mindforge.module.business.projectmanager.dao;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.unorva.mindforge.module.business.projectmanager.domain.entity.RequirementEntity;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import java.util.List;
@Mapper
public interface RequirementDao extends BaseMapper<RequirementEntity> {
    List<RequirementEntity> selectByProjects(@Param("projectIds") List<Long> projectIds);
    RequirementEntity selectInProject(@Param("projectId") Long projectId, @Param("id") Long id);
}
