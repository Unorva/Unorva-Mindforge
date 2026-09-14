# APP 页面圆角卡片布局视觉核验

## Comparison target

- Source visual truth: `C:\Users\yanshijie\AppData\Local\Temp\codex-clipboard-041b8c1d-f30e-4b6f-8629-a03e14d87b94.png`，原始尺寸 3140 × 1638。
- Account settings reference: `C:\Users\yanshijie\AppData\Local\Temp\codex-clipboard-7b069a2d-6871-4ddd-9944-728184b5889d.png`，原始尺寸 2082 × 1606。
- Implementation: `http://localhost:5173/apps/*`，在现有登录态浏览器中逐页核验。
- Desktop viewport: 1574 × 772 CSS px，density 1。
- Mobile viewport: 390 × 844 CSS px，density 1。
- Normalization: 参考图用于确认全局页头、独立圆角内容卡、20px 区块间距和轻边框/阴影层级；各 APP 保留原有业务信息架构与现有组件。

## Routes checked

1. `/apps/projects`：标题、统计、工具栏、项目卡以及详情态。
2. `/apps/mail`：标题卡与三栏工作区外层卡。
3. `/apps/daily-review`：日历卡与复盘内容卡，桌面双栏、移动端上下堆叠。
4. `/apps/finance`：指标卡、图表卡、账户/预算卡和交易明细卡，桌面与移动端。
5. `/apps/notes`：标题卡与笔记工作区卡。
6. `/apps/tickets`、`/apps/tickets/create`：标题卡、统计/列表区和表单卡。
7. `/apps/blog/post`、`detail`、`create`、`edit`、`manage-blog`：列表间距、详情、编辑分栏和管理区。

## Fidelity review

### Layout rhythm

所有 APP 顶层容器统一移除点阵/细线拼接背景，改为透明页面底、独立圆角卡片和 `gap-5` 的区块节奏。页头不再与下方内容粘连；复杂工作区只保留一个明确外层卡，数据看板则按信息组拆分成多张同级卡。

### Shape and elevation

沿用现有 Card 的圆角、边框与阴影 token，没有改动组件库。卡片之间以留白区分层级，避免圆角卡仍被旧版 `gap-px` 和分割线视觉连接。

### Responsive behavior

移动端 390 px 下，博客创建页由双栏变为纵向卡片流，每日复盘由日历/内容双栏变为上下堆叠，资金指标和图表依次纵向排列。资金页的同步时间在窄屏隐藏，避免标题和面包屑被压缩；桌面仍完整显示该信息。

### Typography, color, and assets

字体、字号、状态色、图标和业务图片全部复用现有设计 token 与资产。此次仅调整页面组合方式，没有引入新的视觉语言或替换业务组件。

### Copy and content

原有中英文业务文案、表单字段和交互入口保持不变。布局调整未改变数据、路由、事件或组件行为。

## Findings and fixes

- [P1, fixed] 原 APP 页面仍使用 `gap-px`、分隔线或点阵背景，圆角 Card 看起来像被切割并粘连。顶层页面已统一改为透明背景与 20px 独立卡片间距。
- [P1, fixed] 每日复盘与资金管理的大型容器缺少清晰层级。已按业务分区拆为同级卡，并补齐响应式列布局。
- [P2, fixed] 博客创建/编辑页在新圆角体系下区块相互贴靠。已将主编辑区、封面、状态、分类、日期与操作区组织为独立卡片列。
- [P2, fixed] 资金页移动端页头同时容纳标题、同步时间和面包屑导致拥挤。同步时间在窄屏隐藏，桌面保留。

## Known out-of-scope diagnostics

- 浏览器控制台仍能看到 Notes、Tickets 与 Blog 现有触发器内部嵌套 `<button>` 的 React 警告；这些来自既有业务组件。按“只改 APP 页面布局、不改组件”的约束未处理。
- 本地后端返回格式异常时会出现全局“请求失败”提示；不属于本次页面布局改造。

## Verification

- Production build: passed.
- Targeted ESLint for all edited APP view files: passed.
- `git diff --check` for APP view changes: passed（仅有仓库现有的 LF/CRLF 提示）。
- Browser visual QA: desktop and 390 px mobile passed; no unresolved P0/P1/P2 visual findings.
- Follow-up verification 2026-09-13: `/apps/test` 已按需求移除；账户设置可正常加载；项目、资金与博客管理表格已复用 Tickets 的逐行进入动画。
- Follow-up verification 2026-09-13: 账户设置桌面侧栏入口已收紧至顶部并改用轻量选中态；390 px 下切换为无可见滚动条的横向导航。邮件列表已加入与 Tickets 一致的容器淡入缩放和逐项上移动画，5 条邮件全部具备独立动画节点与列表语义。
- Targeted ESLint for account settings and mail: passed.

## Vertical tabs follow-up

- Source visual truth: 用户本轮明确指定账户设置与项目详情使用同一套竖直 Tabs，并移除“账户设置”与“项目工作台”可见标题；既有账户设置截图继续作为字体、间距、颜色与控件密度参考。
- Rendered implementation evidence: Codex Browser live captures at `/apps/projects/1` and its Account Settings state，desktop 1574 × 772 CSS px and mobile 390 × 844 CSS px，density 1。
- Full-view comparison: 两处侧栏均为左侧竖直轨道、40px 导航项、统一轻灰选中态；桌面显示图标与文字，手机保留竖直结构并缩为 56px 图标轨道。
- Focused region comparison: 已分别检查项目侧栏的需求/缺陷切换和账户设置的 AI/邮箱切换；标题已从视觉层移除，账户弹窗仅保留读屏可访问的隐藏标题。
- Required fidelity surfaces: 字体、字号、颜色 token、圆角、边框、图标和业务文案均沿用现有系统；本轮没有新增或替换图像资产。
- [P2, fixed] 首版在 390px 下保留完整文字侧栏，导致账户表单过窄并产生严重换行。修复为同样的竖直图标轨道，并为每个入口保留 `aria-label` 与隐藏文字。
- Primary interactions tested: 项目“需求管理 → 缺陷管理”与账户设置“AI 配置 → 邮箱绑定”均可正常切换。
- Targeted ESLint and production build: passed.

final result: passed
