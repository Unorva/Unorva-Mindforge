import { Extension } from '@tiptap/core'
import { Image } from '@tiptap/extension-image'
import { Markdown } from '@tiptap/markdown'
import { EditorContent, useEditor, useEditorState } from '@tiptap/react'
import { StarterKit } from '@tiptap/starter-kit'
import {
  Bold,
  Braces,
  Code2,
  Eye,
  FileCode2,
  Heading1,
  Heading2,
  CircleHelp,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListOrdered,
  LoaderCircle,
  Quote,
  Redo2,
  Save,
  Sparkles,
  Strikethrough,
  Underline,
  Undo2,
  X,
} from 'lucide-react'
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'

import { Button } from '@/components/ui/button'
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer'
import { Kbd, KbdGroup } from '@/components/ui/kbd'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

import './markdown-editor.css'

type EditorMode = 'visual' | 'source'
type SaveState = 'idle' | 'saving' | 'saved' | 'error'

export type MarkdownEditorProps = {
  className?: string
  disabled?: boolean
  minHeight?: number
  onChange?: (markdown: string) => void
  onPolish?: (selectedText: string) => Promise<string | void> | string | void
  onSave?: (markdown: string) => Promise<void> | void
  placeholder?: string
  value: string
}

const TyporaShortcuts = Extension.create({
  name: 'typoraShortcuts',

  addKeyboardShortcuts() {
    const setLink = () => {
      if (typeof window === 'undefined') return false
      const previousUrl = this.editor.getAttributes('link').href as string | undefined
      const url = window.prompt('请输入链接地址', previousUrl ?? 'https://')
      if (url === null) return true
      if (!url.trim()) return this.editor.chain().focus().unsetLink().run()
      return this.editor.chain().focus().extendMarkRange('link').setLink({ href: url.trim() }).run()
    }

    const setImage = () => {
      if (typeof window === 'undefined') return false
      const url = window.prompt('请输入图片地址', 'https://')
      if (!url?.trim()) return true
      return this.editor.chain().focus().setImage({ src: url.trim() }).run()
    }

    return {
      'Mod-0': () => this.editor.commands.setParagraph(),
      'Mod-1': () => this.editor.commands.toggleHeading({ level: 1 }),
      'Mod-2': () => this.editor.commands.toggleHeading({ level: 2 }),
      'Mod-3': () => this.editor.commands.toggleHeading({ level: 3 }),
      'Mod-4': () => this.editor.commands.toggleHeading({ level: 4 }),
      'Mod-5': () => this.editor.commands.toggleHeading({ level: 5 }),
      'Mod-6': () => this.editor.commands.toggleHeading({ level: 6 }),
      'Mod-u': () => this.editor.commands.toggleUnderline(),
      'Mod-k': setLink,
      'Mod-Shift-q': () => this.editor.commands.toggleBlockquote(),
      'Mod-Shift-k': () => this.editor.commands.toggleCodeBlock(),
      'Mod-Shift-`': () => this.editor.commands.toggleCode(),
      'Mod-Shift-[': () => this.editor.commands.toggleOrderedList(),
      'Mod-Shift-]': () => this.editor.commands.toggleBulletList(),
      'Mod-Shift-i': setImage,
      'Alt-Shift-5': () => this.editor.commands.toggleStrike(),
    }
  },
})

const editorExtensions = [
  StarterKit.configure({
    link: {
      autolink: true,
      defaultProtocol: 'https',
      openOnClick: false,
    },
  }),
  Image.configure({
    allowBase64: false,
    inline: false,
  }),
  Markdown.configure({
    indentation: { size: 2, style: 'space' },
    markedOptions: { breaks: true, gfm: true },
  }),
  TyporaShortcuts,
]

const typoraSourceShortcuts = new Set([
  '0',
  '1',
  '2',
  '3',
  '4',
  '5',
  '6',
  'b',
  'i',
  'k',
  'u',
])

const typoraSourceShiftShortcuts = new Set(['`', '[', ']', 'i', 'k', 'q'])

function blockSourceFormattingShortcuts(event: React.KeyboardEvent<HTMLTextAreaElement>) {
  const key = event.key.toLowerCase()
  const usesCommandKey = event.ctrlKey || event.metaKey
  const isFormattingShortcut = usesCommandKey && (
    (!event.shiftKey && typoraSourceShortcuts.has(key))
    || (event.shiftKey && typoraSourceShiftShortcuts.has(key))
  )
  const isStrikeShortcut = event.altKey && event.shiftKey && key === '5'

  if (isFormattingShortcut || isStrikeShortcut) event.preventDefault()
}

function ToolbarButton({
  active = false,
  children,
  disabled = false,
  label,
  onClick,
  shortcut,
}: {
  active?: boolean
  children: ReactNode
  disabled?: boolean
  label: string
  onClick: () => void
  shortcut?: string
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={(
          <Button
            aria-label={label}
            aria-pressed={active}
            disabled={disabled}
            onClick={onClick}
            size="icon-sm"
            type="button"
            variant={active ? 'secondary' : 'ghost'}
          />
        )}
      >
        {children}
      </TooltipTrigger>
      <TooltipContent>
        <span>{label}</span>
        {shortcut ? <Kbd>{shortcut}</Kbd> : null}
      </TooltipContent>
    </Tooltip>
  )
}

function ToolbarDivider() {
  return <span aria-hidden="true" className="mx-1 h-5 w-px shrink-0 bg-border" />
}

type Shortcut = {
  keys: string[]
  label: string
}

const shortcutGroups: { title: string; shortcuts: Shortcut[] }[] = [
  {
    title: '文本样式',
    shortcuts: [
      { label: '粗体', keys: ['Ctrl / ⌘', 'B'] },
      { label: '斜体', keys: ['Ctrl / ⌘', 'I'] },
      { label: '下划线', keys: ['Ctrl / ⌘', 'U'] },
      { label: '删除线', keys: ['Alt', 'Shift', '5'] },
      { label: '行内代码', keys: ['Ctrl / ⌘', 'Shift', '`'] },
    ],
  },
  {
    title: '段落结构',
    shortcuts: [
      { label: '正文', keys: ['Ctrl / ⌘', '0'] },
      { label: '一至六级标题', keys: ['Ctrl / ⌘', '1–6'] },
      { label: '引用', keys: ['Ctrl / ⌘', 'Shift', 'Q'] },
      { label: '无序列表', keys: ['Ctrl / ⌘', 'Shift', ']'] },
      { label: '有序列表', keys: ['Ctrl / ⌘', 'Shift', '['] },
      { label: '代码块', keys: ['Ctrl / ⌘', 'Shift', 'K'] },
    ],
  },
  {
    title: '插入与编辑',
    shortcuts: [
      { label: '插入链接', keys: ['Ctrl / ⌘', 'K'] },
      { label: '插入图片', keys: ['Ctrl / ⌘', 'Shift', 'I'] },
      { label: '撤销', keys: ['Ctrl / ⌘', 'Z'] },
      { label: '重做', keys: ['Ctrl', 'Y'] },
    ],
  },
]

function MarkdownShortcutHelp() {
  return (
    <Drawer swipeDirection="right">
      <DrawerTrigger
        render={(
          <Button
            aria-label="查看 Markdown 快捷键"
            size="icon-sm"
            title="快捷键帮助"
            type="button"
            variant="ghost"
          />
        )}
      >
        <CircleHelp />
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader className="relative border-b px-5 pb-4 pt-5 text-left">
          <DrawerTitle>Markdown 快捷键</DrawerTitle>
          <DrawerDescription>
            以下快捷键仅在“显示文本”模式下生效，源码模式不会触发格式命令。
          </DrawerDescription>
          <DrawerClose
            render={(
              <Button
                aria-label="关闭快捷键帮助"
                className="absolute right-3 top-3"
                size="icon-sm"
                type="button"
                variant="ghost"
              />
            )}
          >
            <X />
          </DrawerClose>
        </DrawerHeader>

        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-5 py-5">
          {shortcutGroups.map((group) => (
            <section key={group.title}>
              <h3 className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {group.title}
              </h3>
              <div className="divide-y rounded-lg border">
                {group.shortcuts.map((shortcut) => (
                  <div className="flex min-h-11 items-center justify-between gap-4 px-3 py-2" key={shortcut.label}>
                    <span className="text-sm">{shortcut.label}</span>
                    <KbdGroup className="shrink-0">
                      {shortcut.keys.map((key) => <Kbd key={key}>{key}</Kbd>)}
                    </KbdGroup>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      </DrawerContent>
    </Drawer>
  )
}

export function MarkdownEditor({
  className,
  disabled = false,
  minHeight = 420,
  onChange,
  onPolish,
  onSave,
  placeholder = '开始输入内容，或键入 #、>、- 等 Markdown 标记后按空格…',
  value,
}: MarkdownEditorProps) {
  const draftRef = useRef(value)
  const [draft, setDraft] = useState(value)
  const [lastSaved, setLastSaved] = useState(value)
  const [mode, setMode] = useState<EditorMode>('visual')
  const [isPolishing, setIsPolishing] = useState(false)
  const [saveState, setSaveState] = useState<SaveState>('idle')

  const updateDraft = useCallback((nextValue: string) => {
    draftRef.current = nextValue
    setDraft(nextValue)
    setSaveState('idle')
    onChange?.(nextValue)
  }, [onChange])

  const editor = useEditor({
    content: value,
    contentType: 'markdown',
    editable: !disabled,
    editorProps: {
      attributes: {
        'aria-label': 'Markdown 可视化编辑器',
        'data-placeholder': placeholder,
      },
    },
    extensions: editorExtensions,
    immediatelyRender: false,
    onUpdate: ({ editor: currentEditor }) => updateDraft(currentEditor.getMarkdown()),
  }, [disabled, placeholder])

  const hasPolishableSelection = useEditorState({
    editor,
    selector: ({ editor: currentEditor }) => {
      if (!currentEditor) return false
      const { empty, from, to } = currentEditor.state.selection
      return !empty && Boolean(currentEditor.state.doc.textBetween(from, to, '\n').trim())
    },
  }) ?? false

  useEffect(() => {
    editor?.setEditable(!disabled)
  }, [disabled, editor])

  useEffect(() => {
    if (!editor || value === draftRef.current) return
    draftRef.current = value
    setDraft(value)
    setLastSaved(value)
    setSaveState('idle')
    editor.commands.setContent(value, { contentType: 'markdown', emitUpdate: false })
  }, [editor, value])

  const applyCommand = (command: () => boolean) => {
    command()
  }

  const changeMode = (nextValue: string | number) => {
    const nextMode: EditorMode = nextValue === 'source' ? 'source' : 'visual'
    if (nextMode === 'visual' && editor) {
      editor.commands.setContent(draftRef.current, { contentType: 'markdown', emitUpdate: false })
    }
    setMode(nextMode)
  }

  const insertLink = () => {
    if (!editor || typeof window === 'undefined') return
    const previousUrl = editor.getAttributes('link').href as string | undefined
    const url = window.prompt('请输入链接地址', previousUrl ?? 'https://')
    if (url === null) return
    if (!url.trim()) editor.chain().focus().unsetLink().run()
    else editor.chain().focus().extendMarkRange('link').setLink({ href: url.trim() }).run()
  }

  const insertImage = () => {
    if (!editor || typeof window === 'undefined') return
    const url = window.prompt('请输入图片地址', 'https://')
    if (url?.trim()) editor.chain().focus().setImage({ src: url.trim() }).run()
  }

  const save = async () => {
    const markdown = draftRef.current
    setSaveState('saving')
    try {
      await onSave?.(markdown)
      setLastSaved(markdown)
      setSaveState('saved')
    } catch {
      setSaveState('error')
    }
  }

  const polishSelection = async () => {
    if (!editor || !onPolish) return
    const { empty, from, to } = editor.state.selection
    if (empty) return
    const selectedText = editor.state.doc.textBetween(from, to, '\n')
    if (!selectedText.trim()) return

    setIsPolishing(true)
    try {
      const polishedText = await onPolish(selectedText)
      if (typeof polishedText !== 'string' || polishedText === selectedText) return
      if (to > editor.state.doc.content.size) return
      if (editor.state.doc.textBetween(from, to, '\n') !== selectedText) return

      editor.chain().focus().command(({ tr }) => {
        tr.insertText(polishedText, from, to)
        return true
      }).run()
    } catch {
      // 保留原选区内容，由接入 AI 能力的页面负责展示具体失败原因。
    } finally {
      setIsPolishing(false)
    }
  }

  const isDirty = draft !== lastSaved
  const toolbarDisabled = disabled || !editor

  return (
    <section
      className={cn('overflow-hidden rounded-xl border bg-background shadow-sm', className)}
      style={{ '--markdown-editor-min-height': `${minHeight}px` } as React.CSSProperties}
    >
      <Tabs className="h-full min-h-0 flex-col gap-0" onValueChange={changeMode} value={mode}>
        <header className="flex flex-wrap items-center justify-between gap-3 border-b bg-muted/25 px-3 py-2.5 sm:px-4">
          <div className="flex min-w-0 items-center gap-3">
            <TabsList aria-label="Markdown 编辑模式">
              <TabsTrigger aria-label="显示文本" className="px-2.5" title="显示文本" value="visual"><Eye /></TabsTrigger>
              <TabsTrigger aria-label="Markdown 源码" className="px-2.5" title="Markdown 源码" value="source"><FileCode2 /></TabsTrigger>
            </TabsList>
          </div>

          <div className="flex items-center gap-2">
            <span aria-live="polite" className={cn(
              'hidden text-xs sm:inline',
              saveState === 'error' ? 'text-destructive' : 'text-muted-foreground',
            )}>
              {saveState === 'saving'
                ? '正在保存…'
                : saveState === 'error'
                  ? '保存失败，请重试'
                  : isDirty
                    ? '有未保存的修改'
                    : '所有修改已保存'}
            </span>
            <MarkdownShortcutHelp />
            <Button disabled={disabled || saveState === 'saving' || !isDirty} onClick={() => void save()} size="sm" type="button">
              {saveState === 'saving' ? <LoaderCircle className="animate-spin" /> : <Save />}
              保存
            </Button>
          </div>
        </header>

        <TabsContent className="m-0 flex min-h-0 flex-col" value="visual">
          <div className="flex flex-wrap items-center gap-0.5 border-b bg-background px-2 py-1.5" data-not-typeset>
            <ToolbarButton active={editor?.isActive('bold')} disabled={toolbarDisabled} label="粗体" onClick={() => applyCommand(() => editor?.chain().focus().toggleBold().run() ?? false)} shortcut="Ctrl B"><Bold /></ToolbarButton>
            <ToolbarButton active={editor?.isActive('italic')} disabled={toolbarDisabled} label="斜体" onClick={() => applyCommand(() => editor?.chain().focus().toggleItalic().run() ?? false)} shortcut="Ctrl I"><Italic /></ToolbarButton>
            <ToolbarButton active={editor?.isActive('underline')} disabled={toolbarDisabled} label="下划线" onClick={() => applyCommand(() => editor?.chain().focus().toggleUnderline().run() ?? false)} shortcut="Ctrl U"><Underline /></ToolbarButton>
            <ToolbarButton active={editor?.isActive('strike')} disabled={toolbarDisabled} label="删除线" onClick={() => applyCommand(() => editor?.chain().focus().toggleStrike().run() ?? false)} shortcut="Alt ⇧ 5"><Strikethrough /></ToolbarButton>
            <ToolbarButton active={editor?.isActive('code')} disabled={toolbarDisabled} label="行内代码" onClick={() => applyCommand(() => editor?.chain().focus().toggleCode().run() ?? false)} shortcut="Ctrl ⇧ `"><Code2 /></ToolbarButton>

            <ToolbarDivider />
            <ToolbarButton active={editor?.isActive('heading', { level: 1 })} disabled={toolbarDisabled} label="一级标题" onClick={() => applyCommand(() => editor?.chain().focus().toggleHeading({ level: 1 }).run() ?? false)} shortcut="Ctrl 1"><Heading1 /></ToolbarButton>
            <ToolbarButton active={editor?.isActive('heading', { level: 2 })} disabled={toolbarDisabled} label="二级标题" onClick={() => applyCommand(() => editor?.chain().focus().toggleHeading({ level: 2 }).run() ?? false)} shortcut="Ctrl 2"><Heading2 /></ToolbarButton>
            <ToolbarButton active={editor?.isActive('blockquote')} disabled={toolbarDisabled} label="引用" onClick={() => applyCommand(() => editor?.chain().focus().toggleBlockquote().run() ?? false)} shortcut="Ctrl ⇧ Q"><Quote /></ToolbarButton>
            <ToolbarButton active={editor?.isActive('bulletList')} disabled={toolbarDisabled} label="无序列表" onClick={() => applyCommand(() => editor?.chain().focus().toggleBulletList().run() ?? false)} shortcut="Ctrl ⇧ ]"><List /></ToolbarButton>
            <ToolbarButton active={editor?.isActive('orderedList')} disabled={toolbarDisabled} label="有序列表" onClick={() => applyCommand(() => editor?.chain().focus().toggleOrderedList().run() ?? false)} shortcut="Ctrl ⇧ ["><ListOrdered /></ToolbarButton>
            <ToolbarButton active={editor?.isActive('codeBlock')} disabled={toolbarDisabled} label="代码块" onClick={() => applyCommand(() => editor?.chain().focus().toggleCodeBlock().run() ?? false)} shortcut="Ctrl ⇧ K"><Braces /></ToolbarButton>

            <ToolbarDivider />
            <ToolbarButton active={editor?.isActive('link')} disabled={toolbarDisabled} label="链接" onClick={insertLink} shortcut="Ctrl K"><Link2 /></ToolbarButton>
            <ToolbarButton disabled={toolbarDisabled} label="图片" onClick={insertImage} shortcut="Ctrl ⇧ I"><ImagePlus /></ToolbarButton>

            <ToolbarDivider />
            <ToolbarButton
              disabled={toolbarDisabled || isPolishing || !onPolish || !hasPolishableSelection}
              label="AI 润色选中文本"
              onClick={() => void polishSelection()}
            >
              {isPolishing ? <LoaderCircle className="animate-spin" /> : <Sparkles />}
            </ToolbarButton>

            <ToolbarDivider />
            <ToolbarButton disabled={toolbarDisabled || !(editor?.can().undo() ?? false)} label="撤销" onClick={() => applyCommand(() => editor?.chain().focus().undo().run() ?? false)} shortcut="Ctrl Z"><Undo2 /></ToolbarButton>
            <ToolbarButton disabled={toolbarDisabled || !(editor?.can().redo() ?? false)} label="重做" onClick={() => applyCommand(() => editor?.chain().focus().redo().run() ?? false)} shortcut="Ctrl Y"><Redo2 /></ToolbarButton>
          </div>

          <EditorContent
            className="typeset typeset-mindforge markdown-visual-editor max-w-none flex-1 overflow-y-auto bg-background"
            editor={editor}
          />
        </TabsContent>

        <TabsContent className="m-0 min-h-0" value="source">
          <Textarea
            aria-label="Markdown 源码编辑器"
            className="h-full min-h-(--markdown-editor-min-height) resize-y rounded-none border-0 px-5 py-5 font-mono text-sm leading-7 shadow-none focus-visible:ring-0 sm:px-6"
            disabled={disabled}
            onChange={(event) => updateDraft(event.target.value)}
            onKeyDown={blockSourceFormattingShortcuts}
            placeholder="# 从这里开始写 Markdown…"
            spellCheck={false}
            value={draft}
          />
        </TabsContent>
      </Tabs>
    </section>
  )
}

export default MarkdownEditor
