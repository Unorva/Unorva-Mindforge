create database mind_forge;

USE mind_forge;

DROP TABLE IF EXISTS user;

CREATE TABLE user
(
    id           BIGINT       NOT NULL AUTO_INCREMENT COMMENT '用户ID',
    nickname     VARCHAR(100)          DEFAULT NULL COMMENT '昵称',
    email        VARCHAR(100)          DEFAULT NULL COMMENT '邮箱',
    phone        VARCHAR(100)          DEFAULT NULL COMMENT '手机',
    password     VARCHAR(255) NOT NULL COMMENT '密码哈希',
    avatar       VARCHAR(500)          DEFAULT NULL COMMENT '头像地址',
    version      INT          NOT NULL DEFAULT 0 COMMENT '乐观锁版本号',
    deleted      TINYINT      NOT NULL DEFAULT 0 COMMENT '逻辑删除标识：0未删除，1已删除',
    created_time DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_time DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    PRIMARY KEY (id),
    UNIQUE KEY uk_phone_deleted (phone, deleted), # 解决逻辑删除唯一索引问题
        UNIQUE KEY uk_email_deleted (email, deleted)  # 解决逻辑删除唯一索引问题
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_unicode_ci
    COMMENT = '用户表';

CREATE TABLE daily_review
(
    id           BIGINT     NOT NULL AUTO_INCREMENT COMMENT '主键',
    user_id      BIGINT     NOT NULL COMMENT '所属用户 ID',
    review_date  DATE       NOT NULL COMMENT '复盘所属日期，按用户本地日期保存',
    content      MEDIUMTEXT NOT NULL COMMENT 'Markdown 正文',
    version      INT          NOT NULL DEFAULT 0 COMMENT '乐观锁版本号',
    deleted      TINYINT      NOT NULL DEFAULT 0 COMMENT '逻辑删除标识：0未删除，1已删除',
    created_time DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_time DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    PRIMARY KEY (id),
    KEY idx_daily_review_user_id (user_id),
    UNIQUE KEY uk_daily_review_user_date (user_id, review_date)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='每日复盘';

CREATE DATABASE IF NOT EXISTS project_manager;

USE project_manager;

CREATE TABLE project
(
    id           BIGINT       NOT NULL AUTO_INCREMENT COMMENT '项目ID',
    user_id      BIGINT       NOT NULL COMMENT '项目创建人/所属用户ID',
    name         VARCHAR(200) NOT NULL COMMENT '项目名称',
    description  TEXT                  DEFAULT NULL COMMENT '项目简介',
    status       VARCHAR(20)  NOT NULL DEFAULT '规划中' COMMENT '项目状态：规划中、进行中、已完成、已归档',
    owner_id     BIGINT                DEFAULT NULL COMMENT '项目负责人用户ID；为空时使用所属用户',
    start_date   DATE                  DEFAULT NULL COMMENT '项目开始日期',
    end_date     DATE                  DEFAULT NULL COMMENT '项目结束日期',
    version      INT          NOT NULL DEFAULT 0 COMMENT '乐观锁版本号',
    deleted      TINYINT      NOT NULL DEFAULT 0 COMMENT '逻辑删除标识：0未删除，1已删除',
    created_time DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_time DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    PRIMARY KEY (id),
    KEY idx_project_user_status (user_id, status),
    KEY idx_project_owner_id (owner_id)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='项目表';

CREATE TABLE requirement
(
    id           BIGINT       NOT NULL AUTO_INCREMENT COMMENT '需求ID',
    project_id   BIGINT       NOT NULL COMMENT '所属项目ID',
    title        VARCHAR(300) NOT NULL COMMENT '需求标题',
    description  TEXT                  DEFAULT NULL COMMENT '需求描述、范围或验收标准',
    priority     VARCHAR(10)  NOT NULL DEFAULT '中' COMMENT '优先级：低、中、高',
    status       VARCHAR(20)  NOT NULL DEFAULT '待处理' COMMENT '需求状态：待处理、进行中、已完成',
    owner_id     BIGINT                DEFAULT NULL COMMENT '需求负责人用户ID；为空时使用项目负责人',
    due_date     DATE                  DEFAULT NULL COMMENT '截止日期',
    version      INT          NOT NULL DEFAULT 0 COMMENT '乐观锁版本号',
    deleted      TINYINT      NOT NULL DEFAULT 0 COMMENT '逻辑删除标识：0未删除，1已删除',
    created_time DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_time DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    PRIMARY KEY (id),
    KEY idx_requirement_project_status (project_id, status),
    KEY idx_requirement_owner_id (owner_id),
    KEY idx_requirement_due_date (due_date)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='项目需求表';

CREATE TABLE defect
(
    id                 BIGINT       NOT NULL AUTO_INCREMENT COMMENT '缺陷ID',
    project_id         BIGINT       NOT NULL COMMENT '所属项目ID',
    requirement_id     BIGINT                DEFAULT NULL COMMENT '关联需求ID；可为空',
    title              VARCHAR(300) NOT NULL COMMENT '缺陷标题',
    description        TEXT                  DEFAULT NULL COMMENT '问题描述',
    reproduction_steps TEXT                  DEFAULT NULL COMMENT '复现步骤',
    severity           VARCHAR(10)  NOT NULL DEFAULT '一般' COMMENT '严重程度：轻微、一般、严重、阻断',
    priority           VARCHAR(10)  NOT NULL DEFAULT '中' COMMENT '优先级：低、中、高',
    status             VARCHAR(20)  NOT NULL DEFAULT '待修复' COMMENT '缺陷状态：待修复、修复中、待验证、已关闭',
    owner_id           BIGINT                DEFAULT NULL COMMENT '缺陷负责人用户ID；为空时使用项目负责人',
    due_date           DATE                  DEFAULT NULL COMMENT '预计解决日期',
    version            INT          NOT NULL DEFAULT 0 COMMENT '乐观锁版本号',
    deleted            TINYINT      NOT NULL DEFAULT 0 COMMENT '逻辑删除标识：0未删除，1已删除',
    created_time       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_time       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    PRIMARY KEY (id),
    KEY idx_defect_project_status (project_id, status),
    KEY idx_defect_requirement_id (requirement_id),
    KEY idx_defect_owner_id (owner_id),
    KEY idx_defect_due_date (due_date)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='项目缺陷表';
