package com.unorva.mindforge.module.system.user.domain.entity;

import com.baomidou.mybatisplus.annotation.FieldStrategy;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableName;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.unorva.mindforge.common.datasource.domain.BaseEntity;

import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.ToString;

import java.io.Serial;

/**
 * 用户数据库实体
 *
 * @author yanshijie
 */
@EqualsAndHashCode(callSuper = true)
@Data
@TableName("user")
public class UserEntity extends BaseEntity {

    @Serial private static final long serialVersionUID = 1L;

    /** 昵称 */
    private String nickname;

    /** 邮箱 */
    private String email;

    /** 手机号 */
    @TableField(updateStrategy = FieldStrategy.ALWAYS)
    private String phone;

    /** 密码Hash */
    @JsonIgnore @ToString.Exclude private String password;

    /** 头像URL */
    @TableField(updateStrategy = FieldStrategy.ALWAYS)
    private String avatar;
}
