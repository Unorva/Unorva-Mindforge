import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { type DateRange } from 'react-day-picker'
import { zhCN } from 'react-day-picker/locale'
import { Bold, CalendarRange, Code, Code2, Eye, FilePenLine, Italic, Link, List, LoaderCircle, Quote, Save, Sparkles } from 'lucide-react'

import {
  getDailyReview,
  getDailyReviewCalendar,
  updateDailyReview,
} from '@/api/daily-review/daily-review'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'

function dateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function monthKey(date: Date) {
  return dateKey(date).slice(0, 7)
}

function hasReviewContent(content: string) {
  return Boolean(content.trim())
}

function formatSummaryRange(range: DateRange | undefined) {
  if (!range?.from) return '请选择开始日期和结束日期'
  const formatter = new Intl.DateTimeFormat('zh-CN', { month: 'long', day: 'numeric' })
  return range.to ? `${formatter.format(range.from)} 至 ${formatter.format(range.to)}` : `${formatter.format(range.from)} 至 …`
}

/** 计算 textarea 选区末尾的视口坐标，使浮动菜单跟随用户正在编辑的位置。 */
function getSelectionAnchor(textarea: HTMLTextAreaElement, selectionEnd: number) {
  const styles = window.getComputedStyle(textarea)
  const mirror = document.createElement('div')
  const marker = document.createElement('span')
  const copiedStyles = [
    'boxSizing', 'fontFamily', 'fontSize', 'fontWeight', 'fontStyle', 'letterSpacing',
    'lineHeight', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
    'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth',
  ] as const

  copiedStyles.forEach((property) => {
    mirror.style[property] = styles[property]
  })
  mirror.style.position = 'fixed'
  mirror.style.top = '0'
  mirror.style.left = '-9999px'
  mirror.style.width = `${textarea.offsetWidth}px`
  mirror.style.visibility = 'hidden'
  mirror.style.whiteSpace = 'pre-wrap'
  mirror.style.overflowWrap = 'break-word'
  mirror.style.wordBreak = 'break-word'

  mirror.textContent = textarea.value.slice(0, selectionEnd)
  marker.textContent = '\u200b'
  mirror.appendChild(marker)
  document.body.appendChild(mirror)

  const textareaRect = textarea.getBoundingClientRect()
  const anchor = {
    left: textareaRect.left + marker.offsetLeft - textarea.scrollLeft,
    top: textareaRect.top + marker.offsetTop - textarea.scrollTop,
  }
  mirror.remove()
  return anchor
}

function MarkdownEditor({
  content,
  isSaving,
  onChange,
}: {
  content: string
  isSaving: boolean
  onChange: (content: string) => void
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [selection, setSelection] = useState<{ start: number; end: number; left: number; top: number } | null>(null)

  const syncSelection = () => {
    const textarea = textareaRef.current
    if (!textarea || textarea.selectionStart === textarea.selectionEnd) {
      setSelection(null)
      return
    }
    const anchor = getSelectionAnchor(textarea, textarea.selectionEnd)
    setSelection({ start: textarea.selectionStart, end: textarea.selectionEnd, ...anchor })
    // 菜单为非模态状态，选中文字后仍保持编辑器焦点，可直接继续输入。
    requestAnimationFrame(() => textarea.focus({ preventScroll: true }))
  }

  const formatSelection = (prefix: string, suffix = prefix) => {
    if (!selection) return

    const selectedText = content.slice(selection.start, selection.end)
    const nextContent = `${content.slice(0, selection.start)}${prefix}${selectedText}${suffix}${content.slice(selection.end)}`
    const selectionStart = selection.start + prefix.length
    onChange(nextContent)
    setSelection(null)

    requestAnimationFrame(() => {
      textareaRef.current?.focus()
      // 完成格式化后将光标放到选区末尾，菜单不会因程序重新选中文本而再次弹出。
      textareaRef.current?.setSelectionRange(selectionStart + selectedText.length, selectionStart + selectedText.length)
    })
  }

  return (
    <div className="relative overflow-hidden rounded-lg border border-input bg-background">
      <div className="border-b border-border bg-muted/35 px-4 py-2 text-sm text-muted-foreground">
        使用 Markdown 编写，支持标题、列表、引用、链接和代码块。
      </div>
      <DropdownMenu modal={false} open={selection !== null} onOpenChange={(open) => !open && setSelection(null)}>
        <DropdownMenuTrigger
          aria-hidden="true"
          className="pointer-events-none fixed z-10 size-px opacity-0"
          render={<button type="button" />}
          style={{ left: selection?.left ?? -9999, top: selection?.top ?? -9999 }}
          tabIndex={-1}
        />
        <DropdownMenuContent align="start" side="bottom" sideOffset={8}>
          <DropdownMenuItem onClick={() => formatSelection('**')}><Bold />加粗</DropdownMenuItem>
          <DropdownMenuItem onClick={() => formatSelection('*')}><Italic />斜体</DropdownMenuItem>
          <DropdownMenuItem onClick={() => formatSelection('`')}><Code />行内代码</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => formatSelection('[', '](https://)')}><Link />链接</DropdownMenuItem>
          <DropdownMenuItem onClick={() => formatSelection('> ', '')}><Quote />引用</DropdownMenuItem>
          <DropdownMenuItem onClick={() => formatSelection('- ', '')}><List />列表</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Textarea
        aria-label="每日复盘 Markdown 正文"
        className="min-h-[calc(100vh-420px)] resize-y rounded-none border-0 px-5 py-4 font-mono text-sm leading-7 shadow-none focus-visible:ring-0"
        disabled={isSaving}
        onChange={(event) => {
          setSelection(null)
          onChange(event.target.value)
        }}
        onSelect={syncSelection}
        placeholder={'# 今天的复盘\n\n- 完成了什么\n- 有什么收获\n- 明天准备怎么做'}
        ref={textareaRef}
        value={content}
      />
    </div>
  )
}

function renderInlineMarkdown(value: string): ReactNode[] {
  const tokenPattern = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^\s)]+\))/g
  const nodes: ReactNode[] = []
  let lastIndex = 0

  for (const match of value.matchAll(tokenPattern)) {
    const token = match[0]
    const index = match.index ?? 0
    if (index > lastIndex) nodes.push(value.slice(lastIndex, index))

    if (token.startsWith('**')) {
      nodes.push(<strong key={`${index}-bold`}>{token.slice(2, -2)}</strong>)
    } else if (token.startsWith('`')) {
      nodes.push(<code key={`${index}-code`}>{token.slice(1, -1)}</code>)
    } else {
      const linkMatch = /^\[([^\]]+)\]\(([^\s)]+)\)$/.exec(token)
      if (linkMatch) {
        nodes.push(<a href={linkMatch[2]} key={`${index}-link`} rel="noreferrer" target="_blank">{linkMatch[1]}</a>)
      }
    }
    lastIndex = index + token.length
  }

  if (lastIndex < value.length) nodes.push(value.slice(lastIndex))
  return nodes.length ? nodes : [value]
}

function MarkdownViewer({ content }: { content: string }) {
  const lines = content.split('\n')
  const blocks: ReactNode[] = []

  for (let index = 0; index < lines.length;) {
    const line = lines[index]
    if (!line.trim()) {
      index += 1
      continue
    }

    if (line.startsWith('```')) {
      const codeLines: string[] = []
      const language = line.slice(3).trim()
      index += 1
      while (index < lines.length && !lines[index].startsWith('```')) {
        codeLines.push(lines[index])
        index += 1
      }
      if (index < lines.length) index += 1
      blocks.push(<pre key={`code-${index}`}><code className={language ? `language-${language}` : undefined}>{codeLines.join('\n')}</code></pre>)
      continue
    }

    const heading = /^(#{1,6})\s+(.+)$/.exec(line)
    if (heading) {
      const title = renderInlineMarkdown(heading[2])
      const key = `heading-${index}`
      if (heading[1].length === 1) blocks.push(<h1 key={key}>{title}</h1>)
      else if (heading[1].length === 2) blocks.push(<h2 key={key}>{title}</h2>)
      else if (heading[1].length === 3) blocks.push(<h3 key={key}>{title}</h3>)
      else blocks.push(<h4 key={key}>{title}</h4>)
      index += 1
      continue
    }

    if (/^[-*+]\s+/.test(line)) {
      const items: string[] = []
      while (index < lines.length && /^[-*+]\s+/.test(lines[index])) {
        items.push(lines[index].replace(/^[-*+]\s+/, ''))
        index += 1
      }
      blocks.push(<ul key={`list-${index}`}>{items.map((item, itemIndex) => <li key={itemIndex}>{renderInlineMarkdown(item)}</li>)}</ul>)
      continue
    }

    if (/^\d+\.\s+/.test(line)) {
      const items: string[] = []
      while (index < lines.length && /^\d+\.\s+/.test(lines[index])) {
        items.push(lines[index].replace(/^\d+\.\s+/, ''))
        index += 1
      }
      blocks.push(<ol key={`ordered-list-${index}`}>{items.map((item, itemIndex) => <li key={itemIndex}>{renderInlineMarkdown(item)}</li>)}</ol>)
      continue
    }

    if (line.startsWith('> ')) {
      const quotes: string[] = []
      while (index < lines.length && lines[index].startsWith('> ')) {
        quotes.push(lines[index].slice(2))
        index += 1
      }
      blocks.push(<blockquote key={`quote-${index}`}>{quotes.map((quote, quoteIndex) => <p key={quoteIndex}>{renderInlineMarkdown(quote)}</p>)}</blockquote>)
      continue
    }

    const paragraph: string[] = []
    while (index < lines.length && lines[index].trim() && !/^(#{1,6})\s+|^```|^[-*+]\s+|^\d+\.\s+|^> /.test(lines[index])) {
      paragraph.push(lines[index])
      index += 1
    }
    blocks.push(<p key={`paragraph-${index}`}>{renderInlineMarkdown(paragraph.join(' '))}</p>)
  }

  return (
    <article className="typeset typeset-mindforge max-w-none px-1 py-2">
      {blocks}
    </article>
  )
}

export default function DailyReviewPage() {
  const [selectedDate, setSelectedDate] = useState(() => new Date())
  const [calendarMonth, setCalendarMonth] = useState(() => new Date())
  const [content, setContent] = useState('')
  const [savedContent, setSavedContent] = useState('')
  const [activeTab, setActiveTab] = useState<'preview' | 'source'>('preview')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [completedDateKeys, setCompletedDateKeys] = useState<string[]>([])
  const [summaryRange, setSummaryRange] = useState<DateRange | undefined>()
  const [isSummaryDialogOpen, setIsSummaryDialogOpen] = useState(false)
  const [developmentFeature, setDevelopmentFeature] = useState<string | null>(null)
  const loadRequestId = useRef(0)
  const selectedDateKey = dateKey(selectedDate)
  const hasReview = hasReviewContent(content)
  const hasUnsavedChanges = content !== savedContent

  const loadDailyReview = useCallback(async (date: Date) => {
    const requestId = ++loadRequestId.current
    setIsLoading(true)
    try {
      const result = await getDailyReview(dateKey(date))
      if (requestId !== loadRequestId.current) return
      if (!result.success) {
        throw new Error(result.message || '加载每日复盘失败。')
      }
      const nextContent = result.data ?? ''
      setContent(nextContent)
      setSavedContent(nextContent)
      setActiveTab('preview')
    } catch {
      if (requestId !== loadRequestId.current) return
      setContent('')
      setSavedContent('')
      setActiveTab('preview')
    } finally {
      if (requestId === loadRequestId.current) setIsLoading(false)
    }
  }, [])

  const loadCalendar = useCallback(async (date: Date) => {
    try {
      const result = await getDailyReviewCalendar(monthKey(date))
      if (!result.success) {
        throw new Error(result.message || '加载复盘日历失败。')
      }
      setCompletedDateKeys(result.data ?? [])
    } catch {}
  }, [])

  useEffect(() => {
    void loadDailyReview(selectedDate)
  }, [loadDailyReview, selectedDate])

  useEffect(() => {
    void loadCalendar(calendarMonth)
  }, [calendarMonth, loadCalendar])

  const persistDailyReview = useCallback(async (date: Date, nextContent: string, existedBeforeEditing: boolean) => {
    setIsSaving(true)
    const key = dateKey(date)
    try {
      // 已存在的复盘即使清空正文也只更新为空，不再隐式删除历史记录。
      if (hasReviewContent(nextContent) || existedBeforeEditing) {
        const result = await updateDailyReview({ date: key, content: nextContent })
        if (!result.success) {
          throw new Error(result.message || '保存每日复盘失败。')
        }
        setCompletedDateKeys((keys) => hasReviewContent(nextContent)
          ? [...new Set([...keys, key])]
          : keys.filter((item) => item !== key))
      }
      return true
    } catch {
      return false
    } finally {
      setIsSaving(false)
    }
  }, [])

  const saveSource = async () => {
    if (isSaving || !hasUnsavedChanges) return
    const saved = await persistDailyReview(selectedDate, content, hasReviewContent(savedContent))
    if (saved) setSavedContent(content)
  }

  const handleDateSelect = async (date: Date | undefined) => {
    if (!date || isSaving) return
    if (dateKey(date) === selectedDateKey) {
      setCalendarMonth(date)
      return
    }
    // 切换日期前自动保存源码标签中的未保存内容，避免草稿丢失。
    if (hasUnsavedChanges) {
      const saved = await persistDailyReview(selectedDate, content, hasReviewContent(savedContent))
      if (!saved) return
    }
    setSelectedDate(date)
    setCalendarMonth(date)
    setActiveTab('preview')
  }

  const startSummary = () => {
    if (!summaryRange?.from || !summaryRange.to) return
    setIsSummaryDialogOpen(false)
    setDevelopmentFeature('AI 总结')
  }

  const formattedDate = new Intl.DateTimeFormat('zh-CN', {
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  }).format(selectedDate)
  const completedDates = useMemo(
    () => completedDateKeys.map((key) => new Date(`${key}T00:00:00`)),
    [completedDateKeys],
  )

  return (
    <div className="grid gap-6 xl:grid-cols-[290px_minmax(0,1fr)]">
      <aside className="space-y-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">日历</CardTitle>
            <CardDescription>绿色表示已写，红色表示未写</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center px-2 pb-3">
            <Calendar
              locale={zhCN}
              mode="single"
              modifiers={{ completed: completedDates }}
              classNames={{
                // 状态点需附着于日期按钮，避免被按钮的层级遮挡；默认显示居中的红点。
                day: '[&>button]:after:pointer-events-none [&>button]:after:absolute [&>button]:after:bottom-1 [&>button]:after:left-1/2 [&>button]:after:size-1 [&>button]:after:-translate-x-1/2 [&>button]:after:rounded-full [&>button]:after:bg-red-500',
                // 月份之外的占位日期不显示状态点，避免造成误解。
                outside: '[&>button]:after:hidden',
              }}
              modifiersClassNames={{ completed: '[&>button]:after:!bg-emerald-500' }}
              month={calendarMonth}
              onMonthChange={setCalendarMonth}
              onSelect={(date) => void handleDateSelect(date)}
              selected={selectedDate}
            />
          </CardContent>
        </Card>
        <AlertDialog onOpenChange={setIsSummaryDialogOpen} open={isSummaryDialogOpen}>
          <AlertDialogTrigger
            render={<Button className="w-full" type="button" variant="outline" />}
          >
            <CalendarRange />AI 总结
          </AlertDialogTrigger>
          <AlertDialogContent className="max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle>AI 总结</AlertDialogTitle>
              <AlertDialogDescription>选择需要汇总的每日复盘日期区间。</AlertDialogDescription>
            </AlertDialogHeader>
            <div className="flex justify-center rounded-lg border py-2">
              <Calendar
                locale={zhCN}
                mode="range"
                onSelect={setSummaryRange}
                selected={summaryRange}
              />
            </div>
            <p className="text-center text-sm text-muted-foreground">{formatSummaryRange(summaryRange)}</p>
            <AlertDialogFooter>
              <AlertDialogCancel>取消</AlertDialogCancel>
              <AlertDialogAction disabled={!summaryRange?.from || !summaryRange.to} onClick={startSummary} type="button">
                <Sparkles />开始 AI 总结
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </aside>

      <main className="min-w-0 w-full">
        <Tabs
          // 预览正文较短时也占满右侧网格列，避免切换标签时标题和 Tabs 左移。
          className="w-full gap-0"
          onValueChange={(value) => setActiveTab(value === 'source' ? 'source' : 'preview')}
          value={activeTab}
        >
        <Card className="w-full">
          <CardHeader className="border-b">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
              <div>
                <CardTitle>每日复盘</CardTitle>
                <CardDescription className="mt-1">
                  {formattedDate}
                  {activeTab === 'source' && (hasUnsavedChanges ? ' · 有未保存的修改' : ' · 所有修改已保存')}
                </CardDescription>
              </div>
              <TabsList aria-label="每日复盘视图" className="shrink-0">
                <TabsTrigger value="preview"><Eye />显示</TabsTrigger>
                <TabsTrigger value="source"><Code2 />源码</TabsTrigger>
              </TabsList>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-5">
            <TabsContent value="preview">
              {isLoading ? (
                <div className="flex min-h-105 items-center justify-center gap-2 text-sm text-muted-foreground">
                  <LoaderCircle className="size-4 animate-spin" />正在加载复盘笔记…
                </div>
              ) : hasReview ? (
                <MarkdownViewer content={content} />
              ) : (
                <Empty className="min-h-105 border-dashed">
                  <EmptyHeader>
                    <EmptyMedia variant="icon"><FilePenLine /></EmptyMedia>
                    <EmptyTitle>这一天还没有复盘</EmptyTitle>
                    <EmptyDescription>切换到“源码”标签，用 Markdown 记录值得记住的事、收获或反思。</EmptyDescription>
                  </EmptyHeader>
                </Empty>
              )}
            </TabsContent>

            <TabsContent className="space-y-4" value="source">
              {isLoading ? (
                <div className="flex min-h-105 items-center justify-center gap-2 text-sm text-muted-foreground">
                  <LoaderCircle className="size-4 animate-spin" />正在加载复盘笔记…
                </div>
              ) : (
                <>
                  <MarkdownEditor
                    content={content}
                    isSaving={isSaving}
                    onChange={setContent}
                  />
                  <div className="flex justify-end">
                    <Button disabled={isSaving || !hasUnsavedChanges} onClick={() => void saveSource()} type="button">
                      {isSaving ? <LoaderCircle className="animate-spin" /> : <Save />}
                      保存复盘
                    </Button>
                  </div>
                </>
              )}
            </TabsContent>
          </CardContent>
        </Card>
        </Tabs>
      </main>

      <AlertDialog onOpenChange={(open) => !open && setDevelopmentFeature(null)} open={developmentFeature !== null}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{developmentFeature}</AlertDialogTitle>
            <AlertDialogDescription>功能正在开发中，敬请期待。</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel variant="default">我知道了</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
