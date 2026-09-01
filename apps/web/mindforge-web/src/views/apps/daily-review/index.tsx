import { useCallback, useEffect, useState } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Link from '@tiptap/extension-link'
import { zhCN } from 'react-day-picker/locale'
import {
  Bold,
  FilePenLine,
  Heading1,
  Heading2,
  Italic,
  Link2,
  List,
  ListOrdered,
  Pencil,
  Quote,
  Redo2,
  Underline as UnderlineIcon,
  Undo2,
  X,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { cn } from '@/lib/utils'

type ReviewDraft = {
  content: string
}

const STORAGE_PREFIX = 'mindforge.daily-review.'

const createEmptyDraft = (): ReviewDraft => ({ content: '<p></p>' })

function dateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function draftHasContent(draft: ReviewDraft) {
  return Boolean(draft.content.replace(/<[^>]*>/g, '').trim())
}

function ReviewEditor({ content, onChange }: { content: string; onChange: (content: string) => void }) {
  const editor = useEditor({
    extensions: [StarterKit, Underline, Link.configure({ openOnClick: false })],
    content,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: 'px-5 py-4 outline-none prose prose-sm dark:prose-invert max-w-none',
      },
    },
    onUpdate: ({ editor: currentEditor }) => onChange(currentEditor.getHTML()),
  })

  useEffect(() => {
    if (editor && editor.getHTML() !== content) {
      editor.commands.setContent(content, { emitUpdate: false })
    }
  }, [content, editor])

  const addLink = () => {
    const url = window.prompt('请输入链接地址')
    if (url) editor?.chain().focus().setLink({ href: url }).run()
  }

  if (!editor) return null

  const toolbarItems = [
    { label: '加粗', icon: Bold, active: editor.isActive('bold'), action: () => editor.chain().focus().toggleBold().run() },
    { label: '斜体', icon: Italic, active: editor.isActive('italic'), action: () => editor.chain().focus().toggleItalic().run() },
    { label: '下划线', icon: UnderlineIcon, active: editor.isActive('underline'), action: () => editor.chain().focus().toggleUnderline().run() },
    { label: '一级标题', icon: Heading1, active: editor.isActive('heading', { level: 1 }), action: () => editor.chain().focus().toggleHeading({ level: 1 }).run() },
    { label: '二级标题', icon: Heading2, active: editor.isActive('heading', { level: 2 }), action: () => editor.chain().focus().toggleHeading({ level: 2 }).run() },
    { label: '无序列表', icon: List, active: editor.isActive('bulletList'), action: () => editor.chain().focus().toggleBulletList().run() },
    { label: '有序列表', icon: ListOrdered, active: editor.isActive('orderedList'), action: () => editor.chain().focus().toggleOrderedList().run() },
    { label: '引用', icon: Quote, active: editor.isActive('blockquote'), action: () => editor.chain().focus().toggleBlockquote().run() },
  ]

  return (
    <div className="min-h-[calc(100vh-360px)] overflow-hidden rounded-lg border border-input bg-background">
      <div className="flex flex-wrap items-center gap-1 border-b border-border bg-muted/35 p-2">
        {toolbarItems.map(({ label, icon: Icon, active, action }) => (
          <Button
            aria-label={label}
            className={cn('size-8 p-0', active && 'bg-accent text-accent-foreground')}
            key={label}
            onClick={action}
            size="icon"
            title={label}
            type="button"
            variant="ghost"
          >
            <Icon className="size-4" />
          </Button>
        ))}
        <span className="mx-1 h-5 border-l border-border" />
        <Button aria-label="插入链接" className="size-8 p-0" onClick={addLink} size="icon" title="插入链接" type="button" variant="ghost">
          <Link2 className="size-4" />
        </Button>
        <Button aria-label="撤销" className="size-8 p-0" disabled={!editor.can().undo()} onClick={() => editor.chain().focus().undo().run()} size="icon" title="撤销" type="button" variant="ghost">
          <Undo2 className="size-4" />
        </Button>
        <Button aria-label="重做" className="size-8 p-0" disabled={!editor.can().redo()} onClick={() => editor.chain().focus().redo().run()} size="icon" title="重做" type="button" variant="ghost">
          <Redo2 className="size-4" />
        </Button>
      </div>
      <EditorContent className="[&_.ProseMirror]:min-h-[calc(100vh-430px)]" editor={editor} />
    </div>
  )
}

function ReviewViewer({ content }: { content: string }) {
  // 正文由本地 TipTap 编辑器产生；接入后端后仍需在服务端做 HTML 白名单清洗。
  return <article className="prose prose-sm max-w-none px-1 py-2 dark:prose-invert" dangerouslySetInnerHTML={{ __html: content }} />
}

export default function DailyReviewPage() {
  const [selectedDate, setSelectedDate] = useState(() => new Date())
  const [draft, setDraft] = useState<ReviewDraft>(createEmptyDraft)
  const [editSnapshot, setEditSnapshot] = useState<ReviewDraft>(createEmptyDraft)
  const [isEditing, setIsEditing] = useState(false)
  const [loadedDateKey, setLoadedDateKey] = useState('')
  const [savedAt, setSavedAt] = useState<Date | null>(null)
  const [completedDateKeys, setCompletedDateKeys] = useState<string[]>([])
  const selectedDateKey = dateKey(selectedDate)
  const hasReview = draftHasContent(draft)

  useEffect(() => {
    setCompletedDateKeys(
      Object.keys(localStorage)
        .filter((key) => key.startsWith(STORAGE_PREFIX))
        .map((key) => key.replace(STORAGE_PREFIX, '')),
    )
  }, [])

  useEffect(() => {
    const storedDraft = localStorage.getItem(`${STORAGE_PREFIX}${selectedDateKey}`)
    try {
      const nextDraft = storedDraft ? { ...createEmptyDraft(), ...JSON.parse(storedDraft) } : createEmptyDraft()
      setDraft(nextDraft)
      setEditSnapshot(nextDraft)
    } catch {
      setDraft(createEmptyDraft())
      setEditSnapshot(createEmptyDraft())
    }
    setIsEditing(false)
    setSavedAt(null)
    setLoadedDateKey(selectedDateKey)
  }, [selectedDateKey])

  const saveDraft = useCallback((nextDraft: ReviewDraft) => {
    const hasContent = draftHasContent(nextDraft)
    if (hasContent) {
      localStorage.setItem(`${STORAGE_PREFIX}${selectedDateKey}`, JSON.stringify(nextDraft))
    } else {
      localStorage.removeItem(`${STORAGE_PREFIX}${selectedDateKey}`)
    }
    setCompletedDateKeys((keys) => hasContent
      ? [...new Set([...keys, selectedDateKey])]
      : keys.filter((key) => key !== selectedDateKey))
    setSavedAt(hasContent ? new Date() : null)
  }, [selectedDateKey])

  // 只在编辑状态自动保存，阅读历史笔记时不会触发任何写入。
  useEffect(() => {
    if (!isEditing || loadedDateKey !== selectedDateKey) return
    const timer = window.setTimeout(() => saveDraft(draft), 700)
    return () => window.clearTimeout(timer)
  }, [draft, isEditing, loadedDateKey, saveDraft, selectedDateKey])

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return
    if (isEditing) saveDraft(draft)
    setSelectedDate(date)
  }

  const beginEditing = () => {
    setEditSnapshot(draft)
    setIsEditing(true)
  }

  const cancelEditing = () => {
    setDraft(editSnapshot)
    saveDraft(editSnapshot)
    setIsEditing(false)
  }

  const finishEditing = () => {
    saveDraft(draft)
    setEditSnapshot(draft)
    setIsEditing(false)
  }

  const formattedDate = new Intl.DateTimeFormat('zh-CN', {
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  }).format(selectedDate)
  const completedDates = completedDateKeys.map((key) => new Date(`${key}T00:00:00`))

  return (
    <div className="grid gap-6 xl:grid-cols-[290px_minmax(0,1fr)]">
      <aside className="space-y-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">日历</CardTitle>
            <CardDescription>带圆点的日期已有复盘笔记</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center px-2 pb-3">
            <Calendar
              locale={zhCN}
              mode="single"
              modifiers={{ completed: completedDates }}
              modifiersClassNames={{ completed: 'after:absolute after:bottom-1 after:size-1 after:rounded-full after:bg-primary' }}
              onSelect={handleDateSelect}
              selected={selectedDate}
            />
          </CardContent>
        </Card>
        <Button className="w-full" onClick={() => handleDateSelect(new Date())} type="button" variant="outline">
          今天
        </Button>
      </aside>

      <main>
        <Card>
          <CardHeader className="border-b">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle>每日复盘</CardTitle>
                <CardDescription className="mt-1">
                  {formattedDate}
                  {isEditing && ` · ${savedAt ? '已自动保存' : '正在编辑'}`}
                </CardDescription>
              </div>
              {isEditing ? (
                <div className="flex items-center gap-2">
                  <Button onClick={cancelEditing} type="button" variant="outline"><X />取消</Button>
                  <Button onClick={finishEditing} type="button">完成编辑</Button>
                </div>
              ) : hasReview ? (
                <Button onClick={beginEditing} type="button"><Pencil />编辑</Button>
              ) : null}
            </div>
          </CardHeader>
          <CardContent className="pt-5">
            {isEditing ? (
              <ReviewEditor content={draft.content} onChange={(content) => setDraft({ content })} />
            ) : hasReview ? (
              <ReviewViewer content={draft.content} />
            ) : (
              <Empty className="min-h-105 border-dashed">
                <EmptyHeader>
                  <EmptyMedia variant="icon"><FilePenLine /></EmptyMedia>
                  <EmptyTitle>这一天还没有复盘</EmptyTitle>
                  <EmptyDescription>把值得记住的事、收获或反思写下来。</EmptyDescription>
                </EmptyHeader>
                <EmptyContent>
                  <Button onClick={beginEditing} type="button"><Pencil />开始复盘</Button>
                </EmptyContent>
              </Empty>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
