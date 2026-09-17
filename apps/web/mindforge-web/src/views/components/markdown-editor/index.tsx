import { useMemo, useState } from 'react'
import { FileText } from 'lucide-react'

import MarkdownEditor from '@/components/markdown/markdown-editor'
import { AppPage, AppPageHeader } from '@/components/shared/app-workspace'
import { Badge } from '@/components/ui/badge'

const STORAGE_KEY = 'mindforge-markdown-editor-preview'

const exampleMarkdown = `# Markdown 编辑器

这是一个 **所见即所得** 的 Markdown 编辑器。在“显示文本”模式下，正文只显示排版结果，不会露出 Markdown 标记。

## 快捷键与输入规则

- 使用 **Ctrl + B** 切换粗体，*Ctrl + I* 切换斜体
- 使用 Ctrl + 1 至 Ctrl + 6 切换标题，Ctrl + 0 回到正文
- 在行首键入 \`> \`、\`- \`、\`1. \` 或 \`# \`，按空格即可转换格式
- 使用 Ctrl + Shift + Q、K、[、] 快速切换引用、代码块与列表

> 切换到 Markdown 源码后，格式快捷键会停用，源码本身仍可直接编辑。

你也可以插入 [链接](https://ui.shadcn.com/docs/typeset)、行内代码 \`const answer = 42\`，以及代码块：

\`\`\`ts
function greet(name: string) {
  return \`Hello, \${name}!\`
}
\`\`\`

---

编辑完成后点击右上角的“保存”按钮。`

function getInitialMarkdown() {
  if (typeof window === 'undefined') return exampleMarkdown
  return window.localStorage.getItem(STORAGE_KEY) ?? exampleMarkdown
}

export default function MarkdownEditorTestPage() {
  const initialMarkdown = useMemo(getInitialMarkdown, [])
  const [markdown, setMarkdown] = useState(initialMarkdown)

  const saveMarkdown = async (value: string) => {
    await new Promise((resolve) => window.setTimeout(resolve, 350))
    window.localStorage.setItem(STORAGE_KEY, value)
  }

  return (
    <AppPage className="gap-5 bg-transparent p-0">
      <AppPageHeader
        extra={(
          <Badge className="hidden gap-1.5 bg-primary/10! text-primary! sm:inline-flex" variant="secondary">
            <FileText size={13} />
            组件测试页
          </Badge>
        )}
        showHome={false}
        title="Markdown 编辑器"
      />

      <MarkdownEditor onChange={setMarkdown} onSave={saveMarkdown} value={markdown} />
    </AppPage>
  )
}
