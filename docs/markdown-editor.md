# Markdown 编辑器图片与保存

- 在显示文本或源码模式中，复制截图、图片后按 `Ctrl+V`（macOS 为 `⌘+V`）上传图片。支持 PNG、JPEG、GIF、WebP，单张最大 10 MiB。
- 显示文本模式会先显示本地预览，再显示上传后的图片；源码模式插入 Markdown 图片语法，切回显示文本可查看图片。
- 上传期间可继续输入，保存和模式切换暂时禁用。上传失败会显示错误并保留原选区内容。切换文档、取消编辑或卸载组件会取消待完成的插入。
- `Ctrl+S` / `⌘+S` 在编辑器区域内调用页面的 `onSave`，两种模式均支持；保存中重复按键不会重复提交。保存失败保留草稿，可再次保存。
- 从显示文本模式复制图片时，纯文本剪贴板会包含图片的 Markdown，粘贴到源码模式仍能保留图片。

图片通过后端上传到现有 RustFS 存储，无需开放存储桶的匿名读取权限，也不会把凭据交给浏览器。Markdown 保存稳定的 `/api/files/images/{ownerId}/{id}.{ext}` 地址，显示时由编辑器携带当前 Bearer Token 读取，再生成临时预览地址。图片沿用工作台现有的用户隔离规则，仅上传者可读取。

后端使用既有 `spring.oss` 配置。上传接口为 `POST /api/files/images`，表单字段为 `file`；读取接口为 `GET /api/files/images/{ownerId}/{fileName}`。后端根据文件头验证图片格式，并限制上传大小。Spring multipart 限制和随仓库提供的 nginx 上传大小均已同步配置；外部反向代理也需允许至少 12 MiB 的 multipart 请求。

前端接入保存时应提供可等待的 `onSave(markdown)`，失败应抛出异常；存在外层保存按钮时，通过 `onImageUploadingChange` 禁用上传中的保存。文档切换应通过文档 ID 设置编辑器 `key`。

验证：

```powershell
node --test scripts/test-markdown-clipboard.mjs
node scripts/test-markdown-editor.mjs
cd apps/web/mindforge-web
npm run lint
npm run build
```

浏览器回归脚本需要运行中的 Vite 服务和 Playwright；脚本中的环境变量可指定服务地址及 Playwright 安装路径。后端图片用例为 `ImageFileServiceTest`、`ImageFileControllerTest` 及对象存储相关测试。
