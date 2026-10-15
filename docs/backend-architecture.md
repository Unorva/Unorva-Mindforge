# 后端结构与迁移

2026-10-09：将原 `module.business.workspace` 中的六类业务拆为独立模块。

```text
com.unorva.mindforge
├── common
│   ├── datasource       # 数据源配置、JDBC基础操作、事务业务锁
│   ├── security         # 登录会话配置与当前用户上下文
│   ├── exception        # 基础异常与通用业务错误码
│   ├── file
│   └── web
└── module
    ├── business
    │   ├── notes
    │   ├── blog
    │   ├── finance
    │   ├── mail
    │   ├── ai
    │   ├── dailyreview
    │   ├── projectmanager
    │   └── dashboard
    └── system
        ├── auth
        ├── user
        └── settings
```

## 包内职责

- `controller`：HTTP 路由、请求校验、返回结果；接口路径及 JSON 属性保持兼容。
- `service`：业务用例、规则校验、事务和跨能力协作，不拼装数据库 SQL。
- `mapper`：本模块的数据库查询、写入及记录映射；每个业务操作显式传入用户 ID。
- `manager`：有实际复用或事务协调职责时保留；项目管理及每日复盘延续现有 MyBatis-Plus Manager。
- `domain/param`、`domain/vo`、`domain/model`：独立请求、返回和内部值对象；持久化实体位于已有模块的 `domain/entity`。
- `client`：AI HTTP、邮件 IMAP/SMTP 等外部协议实现；`support` 放本模块加密等辅助能力。

项目管理、每日复盘、用户模块继续使用现有 MyBatis-Plus 实体和 Mapper。此次新增业务的 JDBC 查询保留原 SQL 语义，下沉到模块 Mapper，避免在拆包时同时更换 ORM 和数据库字段。JDBC 基础操作本身不获取登录用户、不承担业务规则。

AI 配置、凭据和对话归 `ai`，通用设置归 `system.settings`。设置服务聚合调用 AI 配置服务；AI 不依赖整个设置服务。通用 ID 请求对象归 `common.web.param`，博客和设置不再依赖笔记模型。

仪表盘作为跨业务的只读汇总，集中查询现有记录；其 SQL 归 `DashboardMapper`，不承接其他模块的写入。

## 数据库迁移

启动前按 README 执行增量脚本：

- `business-locks.sql`：创建 `mf_business_lock`，按用户和业务模块锁定事务；笔记、财务、邮件不再共用用户设置表作为写锁。
- `mail-accounts.sql`：创建邮件账号和远端消息标识表；向现有邮件表增加 `account_id`、`send_attempt_token` 及账号查询索引。

迁移保留现有业务记录。维护脚本检查上述字段和索引是否存在，重复执行会跳过；生产环境也需要执行相同迁移。已有加密凭据继续使用原本的本地密钥及密文格式。

## 邮件状态

草稿保存、账号连接测试、IMAP 同步和 SMTP 发送是独立操作。普通草稿写入不能伪装成成功发送；远端消息通过账号、目录、UIDVALIDITY 和 UID 去重，删除缓存后留下标识墓碑。

发送先在事务内占用草稿并记录本次尝试，再执行 SMTP，最后独立提交发送结果。明确未发送时回到草稿；结果不确定时保留 `sending` 状态，等待人工核实。恢复操作有等待时间，且旧尝试不能覆盖新的发送状态。
