package com.unorva.mindforge.module.business.projectmanager.dao;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.unorva.mindforge.module.business.projectmanager.domain.entity.DefectEntity;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import java.util.List;
@Mapper
public interface DefectDao extends BaseMapper<DefectEntity> {
    List<DefectEntity> selectByProjects(@Param("projectIds") List<Long> projectIds);
    DefectEntity selectInProject(@Param("projectId") Long projectId, @Param("id") Long id);
    int detachRequirement(@Param("projectId") Long projectId, @Param("requirementId") Long requirementId);
}
