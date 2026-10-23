# 笔记绘图

在笔记目录点击文件夹右侧的菜单，选择“新建绘图 (.excalidraw)”。填写名称后会自动添加扩展名，打开文件即可使用 Excalidraw 的图形、箭头、自由书写、文字和图片工具。文件夹右键菜单也提供相同入口。

绘图在停止修改约一秒后自动保存，也可点击“保存”或使用 Ctrl/⌘+S。切换文件会立即提交待保存内容，同一文件的保存请求按顺序执行。保存失败时保留草稿并显示错误，可再次点击保存重试；当前标签页使用 sessionStorage 尽力保留草稿。

工具栏“导出”下载标准 `.excalidraw` JSON 文件，可以在 Excalidraw 官网或其他兼容编辑器中打开；“导入”将文件内容载入当前绘图并保存，替换当前画布。画布菜单还支持导出图片。

场景中的图片随 JSON 一起保存。单个文件内容上限为 4,000,000 个 UTF-16 字符，前后端一致；过大场景会提示减少图片或拆分绘图。现有 MEDIUMTEXT 字段无需迁移数据库。部署时需要同步更新后端与 nginx，笔记新增、更新接口的请求上限为 32 MiB，以容纳 JSON 转义和图片。

Excalidraw 按需加载，其字体由 Vite 从官方 npm 包复制到构建产物的 `excalidraw/fonts/`。正常编辑和导出不需要从 CDN 下载字体。

验证：

```powershell
node --test scripts/test-note-drawing.mjs
```

前端执行 `npm run lint` 和 `npm run build`；后端笔记回归测试包含 `NotesDrawingTest`、`NotesRulesTest`、`NotesEmptyStateTest` 和 `NotesDaoTest`。
