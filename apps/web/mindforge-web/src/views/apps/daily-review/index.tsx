import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { zhCN } from 'react-day-picker/locale'
import {
  CalendarDays,
  CheckCircle2,
  Download,
  Lightbulb,
  LoaderCircle,
  RefreshCcw,
  Sparkles,
  Target,
} from 'lucide-react'

import {
  getDailyReview,
  getDailyReviewCalendar,
  updateDailyReview,
} from '@/api/daily-review/daily-review'
import MarkdownEditor from '@/components/markdown/markdown-editor'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Calendar } from '@/components/ui/calendar'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { AppPage, AppPageHeader, AppWorkspace } from '@/components/shared/app-workspace'

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

type ReportType = 'weekly' | 'monthly' | 'yearly'

const REPORT_OPTIONS: Array<{ description: string; label: string; value: ReportType }> = [
  { description: '查看本周总结', label: '周报', value: 'weekly' },
  { description: '查看本月总结', label: '月报', value: 'monthly' },
  { description: '查看本年总结', label: '年报', value: 'yearly' },
]

const SUMMARY_CONTENT = {
  weekly: {
    eyebrow: '本周总结',
    title: '核心事项稳步推进，工作节奏整体良好',
    overview: '本周围绕产品交付与个人成长两条主线推进，多项关键任务取得阶段性进展。时间分配较为集中，日报中多次提到的协作等待问题仍需在下周优先解决。',
    stats: [
      { label: '日报覆盖', value: '5 / 7 天' },
      { label: '完成事项', value: '12 项' },
      { label: '关键收获', value: '4 条' },
    ],
    highlights: ['完成本周核心功能的界面梳理与交付', '沉淀了两项可复用的工作方法', '重要事项均按计划进入下一阶段'],
    reflections: ['跨团队信息同步仍有延迟', '部分低优先级事项占用了整块专注时间'],
    nextSteps: ['优先关闭本周遗留的两项阻塞', '为核心目标预留连续专注时间', '继续保持工作日记录日报'],
  },
  monthly: {
    eyebrow: '本月总结',
    title: '交付效率持续提升，重点目标已形成清晰闭环',
    overview: '本月日报反映出稳定的执行节奏，核心工作从方案阶段顺利推进到交付阶段。能力沉淀和流程优化开始带来复利，但并行事项偏多仍是影响深度工作的主要因素。',
    stats: [
      { label: '日报覆盖', value: '21 / 30 天' },
      { label: '完成事项', value: '46 项' },
      { label: '里程碑', value: '3 个' },
    ],
    highlights: ['完成三个阶段性里程碑', '重点项目进入稳定交付阶段', '建立了更清晰的复盘与计划习惯'],
    reflections: ['月中出现较明显的上下文切换', '对长期事项的进度记录还不够连续'],
    nextSteps: ['下月聚焦两个最高优先级目标', '减少非必要的并行工作', '每周固定检查月度目标进展'],
  },
  yearly: {
    eyebrow: '年度总结',
    title: '持续行动构成了这一年的成长主线',
    overview: '全年日报呈现出从探索、聚焦到稳定产出的变化。多个长期目标获得实质性推进，知识与方法的积累也更加系统。下一年度可以进一步收窄目标范围，把有效习惯转化为更稳定的成果。',
    stats: [
      { label: '日报覆盖', value: '238 天' },
      { label: '完成事项', value: '326 项' },
      { label: '年度目标', value: '7 / 9' },
    ],
    highlights: ['完成年度核心项目并形成可复用经验', '个人工作系统逐步稳定', '在关键能力方向保持了持续投入'],
    reflections: ['部分季度目标设置得过于分散', '休息与恢复没有被持续纳入计划'],
    nextSteps: ['围绕一个年度主题设定目标', '按季度维护可衡量的关键结果', '为长期健康与学习安排固定节奏'],
  },
} as const

function startOfWeek(date: Date, weekStartsOn = 1) {
  const result = new Date(date)
  result.setHours(0, 0, 0, 0)
  const distance = (result.getDay() - weekStartsOn + 7) % 7
  result.setDate(result.getDate() - distance)
  return result
}

function endOfPeriod(date: Date, reportType: ReportType) {
  if (reportType === 'weekly') {
    const end = startOfWeek(date)
    end.setDate(end.getDate() + 6)
    return end
  }
  if (reportType === 'monthly') return new Date(date.getFullYear(), date.getMonth() + 1, 0)
  return new Date(date.getFullYear(), 11, 31)
}

function startOfPeriod(date: Date, reportType: ReportType) {
  if (reportType === 'weekly') return startOfWeek(date)
  if (reportType === 'monthly') return new Date(date.getFullYear(), date.getMonth(), 1)
  return new Date(date.getFullYear(), 0, 1)
}

function formatPeriod(date: Date, reportType: ReportType) {
  if (reportType === 'yearly') return `${date.getFullYear()} 年`
  if (reportType === 'monthly') return `${date.getFullYear()} 年 ${date.getMonth() + 1} 月`
  const formatter = new Intl.DateTimeFormat('zh-CN', { month: 'short', day: 'numeric' })
  return `${formatter.format(startOfPeriod(date, reportType))} - ${formatter.format(endOfPeriod(date, reportType))}`
}

function SummaryReport({
  reportType,
}: {
  reportType: ReportType
}) {
  const summary = SUMMARY_CONTENT[reportType]

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <Badge><Sparkles />AI 总结</Badge>
        <Badge variant="outline">样式预览</Badge>
      </div>
        <section className="rounded-xl border border-primary/15 bg-primary/5 p-5">
          <p className="text-xs font-medium tracking-[0.16em] text-primary uppercase">{summary.eyebrow}</p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight">{summary.title}</h2>
          <p className="mt-3 max-w-4xl text-sm leading-7 text-muted-foreground">{summary.overview}</p>
        </section>

        <div className="grid gap-3 sm:grid-cols-3">
          {summary.stats.map((stat) => (
            <div className="rounded-xl border bg-card p-4" key={stat.label}>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
              <p className="mt-1 text-2xl font-semibold tracking-tight">{stat.value}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <SummaryList icon={CheckCircle2} items={summary.highlights} title="本期亮点" tone="emerald" />
          <SummaryList icon={Lightbulb} items={summary.reflections} title="反思与发现" tone="amber" />
          <SummaryList icon={Target} items={summary.nextSteps} title="下期计划" tone="blue" />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4 text-xs text-muted-foreground">
          <span>内容来源：本周期已完成的日报</span>
          <span>AI 生成于今天 09:30</span>
        </div>
    </div>
  )
}

function SummaryList({
  icon: Icon,
  items,
  title,
  tone,
}: {
  icon: typeof CheckCircle2
  items: readonly string[]
  title: string
  tone: 'amber' | 'blue' | 'emerald'
}) {
  const tones = {
    amber: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    blue: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    emerald: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  }

  return (
    <section className="rounded-xl border p-4">
      <div className="flex items-center gap-2">
        <span className={`flex size-8 items-center justify-center rounded-lg ${tones[tone]}`}><Icon className="size-4" /></span>
        <h3 className="font-medium">{title}</h3>
      </div>
      <ul className="mt-4 space-y-3 text-sm leading-6 text-muted-foreground">
        {items.map((item) => <li className="flex gap-2" key={item}><span className="mt-2 size-1.5 shrink-0 rounded-full bg-current opacity-50" />{item}</li>)}
      </ul>
    </section>
  )
}

export default function DailyReviewPage() {
  const [openReportType, setOpenReportType] = useState<ReportType | null>(null)
  const [selectedDate, setSelectedDate] = useState(() => new Date())
  const [calendarMonth, setCalendarMonth] = useState(() => new Date())
  const [content, setContent] = useState('')
  const [savedContent, setSavedContent] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [completedDateKeys, setCompletedDateKeys] = useState<string[]>([])
  const [developmentFeature, setDevelopmentFeature] = useState<string | null>(null)
  const loadRequestId = useRef(0)
  const selectedDateKey = dateKey(selectedDate)
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
    } catch {
      if (requestId !== loadRequestId.current) return
      setContent('')
      setSavedContent('')
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
    } catch {
      // 日历加载失败时保留当前已完成日期，主复盘内容仍可独立使用。
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

  const saveReview = async (nextContent: string) => {
    const saved = await persistDailyReview(selectedDate, nextContent, hasReviewContent(savedContent))
    if (!saved) throw new Error('保存每日复盘失败。')
    setSavedContent(nextContent)
  }

  const handleDateSelect = async (date: Date | undefined) => {
    if (!date || isSaving) return
    if (dateKey(date) === selectedDateKey) {
      setCalendarMonth(date)
      return
    }
    // 切换日期前自动保存编辑标签中的未保存内容，避免草稿丢失。
    if (hasUnsavedChanges) {
      const saved = await persistDailyReview(selectedDate, content, hasReviewContent(savedContent))
      if (!saved) return
    }
    setSelectedDate(date)
    setCalendarMonth(date)
  }

  const completedDates = useMemo(
    () => completedDateKeys.map((key) => new Date(`${key}T00:00:00`)),
    [completedDateKeys],
  )
  const openReport = REPORT_OPTIONS.find((item) => item.value === openReportType)

  return (
    <AppPage className="gap-5 bg-transparent p-0">
      <AppPageHeader title="复盘报告" />

        <AppWorkspace className="grid gap-5 overflow-visible bg-transparent xl:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="space-y-5">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base"><CalendarDays className="size-4" />日历</CardTitle>
                <CardDescription>绿色表示已写，红色表示未写</CardDescription>
              </CardHeader>
              <CardContent className="px-2 pb-3">
                <div className="flex justify-center">
                  <Calendar
                    locale={zhCN}
                    mode="single"
                    modifiers={{ completed: completedDates }}
                    classNames={{
                      day: '[&>button]:after:pointer-events-none [&>button]:after:absolute [&>button]:after:bottom-1 [&>button]:after:left-1/2 [&>button]:after:size-1 [&>button]:after:-translate-x-1/2 [&>button]:after:rounded-full [&>button]:after:bg-red-500',
                      outside: '[&>button]:after:hidden',
                    }}
                    modifiersClassNames={{ completed: '[&>button]:after:!bg-emerald-500' }}
                    month={calendarMonth}
                    onMonthChange={setCalendarMonth}
                    onSelect={(date) => void handleDateSelect(date)}
                    selected={selectedDate}
                  />
                </div>
              </CardContent>
            </Card>

            <div className="space-y-3 px-1">
              <p className="text-xs font-medium text-muted-foreground">周期报告</p>
              <div className="grid grid-cols-3 gap-2">
                {REPORT_OPTIONS.map((report) => (
                  <Button
                    aria-label={report.description}
                    className="h-auto flex-col gap-1 py-3"
                    key={report.value}
                    onClick={() => setOpenReportType(report.value)}
                    type="button"
                    variant="outline"
                  >
                    <span className="text-base font-semibold">{report.label.slice(0, 1)}</span>
                    <span className="text-xs font-normal text-muted-foreground">{report.label}</span>
                  </Button>
                ))}
              </div>
            </div>
          </aside>

          <main className="h-full min-h-0 min-w-0">
            {isLoading ? (
              <div className="flex min-h-105 items-center justify-center gap-2 text-sm text-muted-foreground">
                <LoaderCircle className="size-4 animate-spin" />正在加载日报…
              </div>
            ) : (
              <MarkdownEditor
                className="h-full shadow-none"
                minHeight={480}
                onChange={setContent}
                onPolish={() => setDevelopmentFeature('AI 润色')}
                onSave={saveReview}
                placeholder="记录今天完成的事、收获与明日计划……"
                value={content}
              />
            )}
          </main>

          <Dialog onOpenChange={(open) => !open && setOpenReportType(null)} open={openReportType !== null}>
            <DialogContent className="max-h-[calc(100dvh-2rem)] grid-rows-[auto_minmax(0,1fr)] overflow-hidden p-0 sm:max-w-5xl">
              {openReportType ? (
                <>
                  <DialogHeader className="border-b px-6 py-5 pr-14">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <DialogTitle className="text-lg">{openReport?.label} · {formatPeriod(selectedDate, openReportType)}</DialogTitle>
                        <DialogDescription className="mt-2">根据本周期内的日报内容自动归纳</DialogDescription>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button onClick={() => setDevelopmentFeature(`${openReport?.label}导出`)} size="sm" type="button" variant="outline">
                          <Download />导出报告
                        </Button>
                        <Button onClick={() => setDevelopmentFeature(`${openReport?.label} AI 总结`)} size="sm" type="button" variant="outline">
                          <RefreshCcw />重新生成
                        </Button>
                      </div>
                    </div>
                  </DialogHeader>
                  <div className="min-h-0 overflow-y-auto px-6 py-6">
                    <SummaryReport reportType={openReportType} />
                  </div>
                </>
              ) : null}
            </DialogContent>
          </Dialog>

          <AlertDialog onOpenChange={(open) => !open && setDevelopmentFeature(null)} open={developmentFeature !== null}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{developmentFeature}</AlertDialogTitle>
                <AlertDialogDescription>当前仅完成界面样式，相关能力将在后续接入。</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel variant="default">我知道了</AlertDialogCancel>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </AppWorkspace>
    </AppPage>
  )
}
