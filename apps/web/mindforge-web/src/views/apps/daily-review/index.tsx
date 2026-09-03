import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { type DateRange } from 'react-day-picker'
import { zhCN } from 'react-day-picker/locale'
import { CalendarRange, FilePenLine, LoaderCircle, Pencil, Save, Sparkles, X } from 'lucide-react'

import {
  getDailyReview,
  getDailyReviewCalendar,
  updateDailyReview,
} from '@/api/daily-review/daily-review'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
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
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
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

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback
}

function formatSummaryRange(range: DateRange | undefined) {
  if (!range?.from) return '请选择开始日期和结束日期'
  const formatter = new Intl.DateTimeFormat('zh-CN', { month: 'long', day: 'numeric' })
  return range.to ? `${formatter.format(range.from)} 至 ${formatter.format(range.to)}` : `${formatter.format(range.from)} 至 …`
}

function MarkdownEditor({ content, onChange }: { content: string; onChange: (content: string) => void }) {
  return (
    <div className="overflow-hidden rounded-lg border border-input bg-background">
      <div className="border-b border-border bg-muted/35 px-4 py-2 text-sm text-muted-foreground">
        使用 Markdown 编写，支持标题、列表、引用、链接和代码块。
      </div>
      <Textarea
        aria-label="每日复盘 Markdown 正文"
        className="min-h-[calc(100vh-420px)] resize-y rounded-none border-0 px-5 py-4 font-mono text-sm leading-7 shadow-none focus-visible:ring-0"
        onChange={(event) => onChange(event.target.value)}
        placeholder={'# 今天的复盘\n\n- 完成了什么\n- 有什么收获\n- 明天准备怎么做'}
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
  const [editSnapshot, setEditSnapshot] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [completedDateKeys, setCompletedDateKeys] = useState<string[]>([])
  const [summaryRange, setSummaryRange] = useState<DateRange | undefined>()
  const [isSummaryDialogOpen, setIsSummaryDialogOpen] = useState(false)
  const [developmentFeature, setDevelopmentFeature] = useState<string | null>(null)
  const loadRequestId = useRef(0)
  const selectedDateKey = dateKey(selectedDate)
  const hasReview = hasReviewContent(content)

  const loadDailyReview = useCallback(async (date: Date) => {
    const requestId = ++loadRequestId.current
    setIsLoading(true)
    setErrorMessage('')
    try {
      const result = await getDailyReview(dateKey(date))
      if (requestId !== loadRequestId.current) return
      if (!result.success) {
        throw new Error(result.message || '加载每日复盘失败。')
      }
      const nextContent = result.data ?? ''
      setContent(nextContent)
      setEditSnapshot(nextContent)
      setIsEditing(false)
    } catch (error) {
      if (requestId !== loadRequestId.current) return
      setContent('')
      setEditSnapshot('')
      setIsEditing(false)
      setErrorMessage(getErrorMessage(error, '加载每日复盘失败，请检查网络后重试。'))
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
    } catch (error) {
      setErrorMessage(getErrorMessage(error, '加载复盘日历失败，请稍后重试。'))
    }
  }, [])

  useEffect(() => {
    void loadDailyReview(selectedDate)
  }, [loadDailyReview, selectedDate])

  useEffect(() => {
    void loadCalendar(calendarMonth)
  }, [calendarMonth, loadCalendar])

  const persistDailyReview = useCallback(async (date: Date, nextContent: string, existedBeforeEditing: boolean) => {
    setIsSaving(true)
    setErrorMessage('')
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
    } catch (error) {
      setErrorMessage(getErrorMessage(error, '保存每日复盘失败，请稍后重试。'))
      return false
    } finally {
      setIsSaving(false)
    }
  }, [])

  const handleDateSelect = async (date: Date | undefined) => {
    if (!date || isSaving) return
    if (dateKey(date) === selectedDateKey) {
      setCalendarMonth(date)
      return
    }
    if (isEditing) {
      const saved = await persistDailyReview(selectedDate, content, hasReviewContent(editSnapshot))
      if (!saved) return
    }
    setSelectedDate(date)
    setCalendarMonth(date)
  }

  const beginEditing = () => {
    setEditSnapshot(content)
    setErrorMessage('')
    setIsEditing(true)
  }

  const cancelEditing = () => {
    setContent(editSnapshot)
    setIsEditing(false)
  }

  const finishEditing = async () => {
    if (isSaving) return
    const saved = await persistDailyReview(selectedDate, content, hasReviewContent(editSnapshot))
    if (saved) {
      setEditSnapshot(content)
      setIsEditing(false)
    }
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

      <main>
        <Card>
          <CardHeader className="border-b">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle>每日复盘</CardTitle>
                <CardDescription className="mt-1">
                  {formattedDate}
                  {isEditing && ' · 编辑完成后将保存到服务器'}
                </CardDescription>
              </div>
              {isEditing ? (
                <div className="flex items-center gap-2">
                  <Button disabled={isSaving} onClick={cancelEditing} type="button" variant="outline"><X />取消</Button>
                  <Button disabled={isSaving} onClick={() => void finishEditing()} type="button">
                    {isSaving ? <LoaderCircle className="animate-spin" /> : <Save />}
                    完成编辑
                  </Button>
                </div>
              ) : hasReview ? (
                <div className="flex items-center gap-2">
                  <AlertDialog>
                    <AlertDialogTrigger
                      render={<Button disabled={isLoading} type="button" variant="outline" />}
                    >
                      <Sparkles />AI 润色
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>AI 润色</AlertDialogTitle>
                        <AlertDialogDescription>功能正在开发中，敬请期待。</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel variant="default">我知道了</AlertDialogCancel>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                  <Button disabled={isLoading} onClick={beginEditing} type="button"><Pencil />编辑</Button>
                </div>
              ) : null}
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-5">
            {errorMessage && (
              <Alert variant="destructive">
                <AlertTitle>操作未完成</AlertTitle>
                <AlertDescription>{errorMessage}</AlertDescription>
              </Alert>
            )}
            {isLoading ? (
              <div className="flex min-h-105 items-center justify-center gap-2 text-sm text-muted-foreground">
                <LoaderCircle className="size-4 animate-spin" />正在加载复盘笔记…
              </div>
            ) : isEditing ? (
              <MarkdownEditor content={content} onChange={setContent} />
            ) : hasReview ? (
              <MarkdownViewer content={content} />
            ) : (
              <Empty className="min-h-105 border-dashed">
                <EmptyHeader>
                  <EmptyMedia variant="icon"><FilePenLine /></EmptyMedia>
                  <EmptyTitle>这一天还没有复盘</EmptyTitle>
                  <EmptyDescription>用 Markdown 记录值得记住的事、收获或反思。</EmptyDescription>
                </EmptyHeader>
                <EmptyContent>
                  <Button onClick={beginEditing} type="button"><Pencil />开始复盘</Button>
                </EmptyContent>
              </Empty>
            )}
          </CardContent>
        </Card>
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
