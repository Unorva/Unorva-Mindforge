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
