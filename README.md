# Unorva Mindforge

个人 AI 工作台，包含项目、需求与缺陷管理、Markdown 笔记与目录、每日复盘及周期报告、博客与评论、财务账本、多账号邮件收发、个人资料和账户设置。前端使用 React / TypeScript，后端使用 Java / Spring Boot，业务数据存储在 MySQL，登录会话使用 Redis。

## 本地启动

准备 JDK 25、Maven 3.9、Node.js 24 或更新版本，以及可连接的 MySQL 和 Redis。以下命令在 PowerShell 中执行。

本机依赖和数据库准备好后，可在仓库根目录一键启动：

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\Start-Mindforge.ps1
```

脚本在后台启动后端 `8080` 和前端 `5173`，等待接口与页面就绪后打开浏览器；重复运行会复用已就绪的服务。日志保存在 `.local/run/`，关闭启动窗口后服务继续运行。可用 `-FrontendPort 5174` 切换前端端口，`-NoBrowser` 禁止自动打开浏览器；Maven 不在 `PATH` 中时，用 `-MavenCommand '完整的 mvn.cmd 路径'` 指定。启动命令跳过测试编译，测试验证仍需单独执行 `mvn test`。

1. 检查 `backend/mindforge-server/src/main/resources/application-dev.yml` 中的 MySQL、Redis 地址和认证信息。本地默认使用 `dev` 配置，后端端口为 `8080`。生产环境通过 `SPRING_PROFILES_ACTIVE=prod` 选择生产配置。
2. 在仓库根目录生成本地 AI 凭据加密配置：

   ```powershell
   .\scripts\Initialize-LocalSecrets.ps1
   ```

   配置保存在 `backend/mindforge-server/.local/application-secrets.yml`，已被 Git 忽略。脚本保留已有密钥；迁移数据库时同时保留这个文件，否则已保存的 API Key 无法解密。也可以通过 `MINDFORGE_AI_ENCRYPTION_KEY` 提供 Base64 编码的 32 字节密钥。

3. 在后端目录检查并初始化数据库：

   ```powershell
   Set-Location backend/mindforge-server
   mvn dependency:build-classpath '-Dmdep.outputFile=target/runtime-classpath.txt' '-Dmdep.includeScope=runtime'
   $databaseClasspath = (Get-Content -Raw target/runtime-classpath.txt).Trim()
   java --class-path $databaseClasspath ../../scripts/DatabaseMaintenance.java src/main/resources/application-dev.yml inspect
   java --class-path $databaseClasspath ../../scripts/DatabaseMaintenance.java src/main/resources/application-dev.yml apply sql/inti.sql sql/workspace-features.sql sql/business-locks.sql sql/mail-accounts.sql sql/appearance-settings.sql
   ```

   `DatabaseMaintenance.java` 直接读取配置中的连接信息，不输出密码；`apply` 接受增量建表，以及邮件和背景偏好迁移中明确列出的新增字段和索引，重复执行时跳过已存在项。迁移保留现有数据，不执行清表或重建。其他已有表的字段差异需要单独检查。

4. 在同一后端目录运行测试并启动服务：

   ```powershell
   mvn test
   mvn spring-boot:run
   ```

5. 新开终端，进入前端目录：

   ```powershell
   Set-Location apps/web/mindforge-web
   npm ci
   npm run lint
   npm run build
   npm run dev
   ```

   打开 Vite 输出的地址，默认是 `http://localhost:5173`，先注册再登录。端口被占用时使用 `npm run dev -- --host 127.0.0.1 --port 5174`。本轮启动地址为 `http://127.0.0.1:5174`，后端运行在 `8080`。开发代理默认连接 `http://127.0.0.1:8080`。可参考 `.env.example` 在 `.env.local` 中设置 `API_PROXY_TARGET` 或 `VITE_API_BASE_URL`。

   后端允许本机 `5173`、`5174` 来源。其他端口或部署域名通过 `MINDFORGE_ALLOWED_ORIGINS` 配置，以逗号分隔完整来源地址。Vite 和 Nginx 只代理认证接口，登录页面等 SPA 路径保留页面回退。

## AI 配置与功能范围

在账户设置的 AI 页面填写兼容接口的基础地址、模型名称和 API Key。基础地址通常包含 `/v1`；后端会追加 `/chat/completions`。保存后可以测试连接，再使用 AI 对话。API Key 在服务器使用 AES-256-GCM 加密，接口不会回传明文；提交空白 Key 会保留已有凭据，移除凭据需要使用删除操作。

MSW 默认关闭，业务页面使用真实后端；只有显式设置 `VITE_ENABLE_MOCKS=true` 才启用模板演示数据。

在头像菜单的「账户设置 → 背景设置」中，可选择默认纯色、斑点或用户名水印，预览后点击「保存背景」生效。默认保持当前白色背景，所有样式均自动适配深色主题；水印使用个人资料昵称，修改昵称后同步更新。选择按账户保存，刷新和重新登录后仍保留，也可通过 `/settings?tab=appearance` 直接打开。

后端邮件接口支持本地草稿、账号管理、IMAP 收件同步和 SMTP 发送，使用账号配置的 TLS 连接及加密保存的凭据。结果不确定的发送保留待确认状态，避免自动重复投递。邮箱地址验证和二步验证尚未实现，设置不会将其伪装为已启用。周期复盘报告展示实际保存的记录；AI 对话回复来自配置的兼容接口。

后端按业务独立分包，包内区分接口、业务流程、数据访问和请求/返回模型；具体职责及迁移说明见 [后端结构说明](docs/backend-architecture.md)。

## 连接实际邮箱

打开工作台的「邮件中心」→「管理邮箱」→「添加邮箱」，选择平台并填写邮箱地址和该平台生成的授权凭据。保存后点击「测试连接」，再回到邮件中心点击「同步邮件」。可查看所有账号或按账号筛选，在写信窗口选择发件账号、保存草稿或实际发送；收到的邮件支持回复、已读和星标。

| 平台 | 接入方式 | 收件服务器 | 发件服务器 |
| --- | --- | --- | --- |
| QQ 邮箱 | 开启 IMAP/SMTP，使用客户端授权码 | `imap.qq.com:993`，SSL/TLS | `smtp.qq.com:465`，SSL/TLS |
| 网易 163 | 开启 IMAP/SMTP，使用客户端授权码 | `imap.163.com:993`，SSL/TLS | `smtp.163.com:465`，SSL/TLS |
| 网易 126 | 开启 IMAP/SMTP，使用客户端授权码 | `imap.126.com:993`，SSL/TLS | `smtp.126.com:465`，SSL/TLS |
| Gmail | 开启两步验证后生成应用专用密码，或使用具有邮箱权限的 OAuth2 访问令牌 | `imap.gmail.com:993`，SSL/TLS | `smtp.gmail.com:465`，SSL/TLS |
| Outlook / Hotmail | 开启 IMAP，使用具有 IMAP/SMTP 权限的 OAuth2 访问令牌 | `outlook.office365.com:993`，SSL/TLS | `smtp-mail.outlook.com:587`，STARTTLS |
| iCloud | 使用 Apple 账户生成的 App 专用密码 | `imap.mail.me.com:993`，SSL/TLS | `smtp.mail.me.com:587`，STARTTLS |
| 企业及其他邮箱 | 选择自定义并填写服务商提供的服务器、端口、TLS 与认证方式 | 自定义 IMAP | 自定义 SMTP |

Gmail 的应用专用密码说明见 [Google 官方帮助](https://support.google.com/accounts/answer/185833)。Outlook 的现代认证要求见 [Microsoft 官方设置说明](https://support.microsoft.com/en-us/outlook/pop-imap-and-smtp-settings-for-outlook-com)，访问令牌须包含 `https://outlook.office.com/IMAP.AccessAsUser.All` 和 `https://outlook.office.com/SMTP.Send` 权限，参见 [Microsoft OAuth 文档](https://learn.microsoft.com/en-us/exchange/client-developer/legacy-protocols/how-to-authenticate-an-imap-pop-smtp-application-by-using-oauth/)。Gmail OAuth2 需要 `https://mail.google.com/` 权限，参见 [Google XOAUTH2 文档](https://developers.google.com/workspace/gmail/imap/xoauth2-protocol)。iCloud 的用户名与 App 密码要求见 [Apple 官方说明](https://support.apple.com/102525)。组织邮箱是否允许 IMAP/SMTP 取决于管理员策略。

当前 OAuth2 支持填写访问令牌；令牌过期后需手动更新，尚无网页登录授权及自动刷新。同步读取收件箱最近 200 封邮件，正文以纯文本展示，暂未提供附件操作和历史邮件分页。已读和星标会同步到原邮箱；归档、回收站及永久删除作用于工作台本地缓存。发件通过 SMTP 实际投递并保存工作台的已发送记录，暂不写入服务商的已发送文件夹。

邮箱凭据在服务器加密保存，沿用初始化脚本生成的持久密钥；也可单独配置 `MINDFORGE_MAIL_ENCRYPTION_KEY`（Base64 编码的 32 字节密钥）。迁移数据库时保留原密钥。内网企业邮箱需部署者显式设置 `MINDFORGE_MAIL_ALLOW_PRIVATE_HOSTS=true`，默认只连接公网服务器，并验证 TLS 证书。

本地代理可能将邮箱服务器解析到 `198.18.0.0/15` 的 Fake-IP。`dev` 配置已开启精确兼容：只有以上六个平台的预设协议、主机及端口可通过该虚拟地址连接，仍验证真实主机的 TLS 证书；自定义域名、非预设端口和内网地址不在此兼容范围。生产配置默认关闭，可通过 `MINDFORGE_MAIL_ALLOW_PROVIDER_FAKE_IP=true` 单独启用。连接测试会区分收件/发件阶段并提示认证、DNS、超时、TLS 或地址限制的具体原因。

发送结果无法确认时，邮件进入待确认状态，页面不会自动重发。应先在服务商处核对投递结果；确认未投递后，等待至少五分钟再通过专门入口恢复草稿，防止重复发送。

## 验证与格式化

测试范围和结果见 [验证记录](docs/implementation-verification.md)。后端启动后，可从仓库根目录运行 `python scripts/smoke_workspace.py` 验证真实 HTTP / MySQL / Redis 链路。脚本创建隔离的临时账户，结束或失败时自动清理该次测试数据，输出数据库检查结果；`--keep-fixtures` 可保留测试数据排查问题。AI 部分使用本地协议夹具，不代表外部模型质量验证。

验证前端代理及页面刷新路径时，运行：

```powershell
python scripts/smoke_workspace.py --base-url http://127.0.0.1:5174 --verify-frontend-routes
```

Java 格式化使用 `scripts/Format-Java.ps1`，检查命令为 `.\scripts\Format-Java.ps1 -Check`；首次运行会下载格式化工具。前端可运行 `npm run format` 或 `npm run format:check`。Java 代码按四空格缩进、明确导入、分层及参数校验等规范整理，未声明已经通过全部 P3C 自动规则检查。
