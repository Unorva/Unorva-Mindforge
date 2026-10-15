import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { zhCN } from 'react-day-picker/locale';
import { CalendarDays, LoaderCircle } from 'lucide-react';

import {
  getDailyReview,
  getDailyReviewCalendar,
  updateDailyReview,
} from '@/api/daily-review/daily-review';
import MarkdownEditor from '@/components/markdown/markdown-editor';
import { Button } from '@/components/ui/button';
import { useSearchParams } from 'react-router';
import ReviewReport from './report';
import { createConversation, sendMessage } from '@/api/ai/ai';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { AppPage, AppPageHeader, AppWorkspace } from '@/components/shared/app-workspace';

function dateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function monthKey(date: Date) {
  return dateKey(date).slice(0, 7);
}

function hasReviewContent(content: string) {
  return Boolean(content.trim());
}

type ReportType = 'weekly' | 'monthly' | 'yearly';

const REPORT_OPTIONS: Array<{ description: string; label: string; value: ReportType }> = [
  { description: '查看本周总结', label: '周报', value: 'weekly' },
  { description: '查看本月总结', label: '月报', value: 'monthly' },
  { description: '查看本年总结', label: '年报', value: 'yearly' },
];

export default function DailyReviewPage() {
  const [openReportType, setOpenReportType] = useState<ReportType | null>(null);
  const [searchParams] = useSearchParams();
  const [selectedDate, setSelectedDate] = useState(() => {
    const value = searchParams.get('date');
    return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(value + 'T00:00:00') : new Date();
  });
  const [calendarMonth, setCalendarMonth] = useState(() => selectedDate);
  const [content, setContent] = useState('');
  const [savedContent, setSavedContent] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [loadedDateKey, setLoadedDateKey] = useState<string | null>(null);
  const [completedDateKeys, setCompletedDateKeys] = useState<string[]>([]);
  const loadRequestId = useRef(0);
  const loadedReview = useRef<{ date: string; requestId: number } | null>(null);
  const selectedDateKey = dateKey(selectedDate);
  const hasUnsavedChanges = content !== savedContent;
  const canEdit = !isLoading && !isSaving && !loadError && loadedDateKey === selectedDateKey;

  const loadDailyReview = useCallback(async (date: Date) => {
    const requestId = ++loadRequestId.current;
    loadedReview.current = null;
    setLoadedDateKey(null);
    setLoadError('');
    setIsLoading(true);
    try {
      const result = await getDailyReview(dateKey(date));
      if (requestId !== loadRequestId.current) return;
      if (!result.success) {
        throw new Error(result.message || '加载每日复盘失败。');
      }
      const nextContent = result.data ?? '';
      loadedReview.current = { date: dateKey(date), requestId };
      setLoadedDateKey(dateKey(date));
      setContent(nextContent);
      setSavedContent(nextContent);
    } catch {
      if (requestId !== loadRequestId.current) return;
      setLoadError('未能读取该日期的复盘。请重新加载成功后再编辑，已有记录不会被覆盖。');
    } finally {
      if (requestId === loadRequestId.current) setIsLoading(false);
    }
  }, []);

  const loadCalendar = useCallback(async (date: Date) => {
    try {
      const result = await getDailyReviewCalendar(monthKey(date));
      if (!result.success) {
        throw new Error(result.message || '加载复盘日历失败。');
      }
      setCompletedDateKeys(result.data ?? []);
    } catch {
      // 日历加载失败时保留当前已完成日期，主复盘内容仍可独立使用。
    }
  }, []);

  useEffect(() => {
    void loadDailyReview(selectedDate);
  }, [loadDailyReview, selectedDate]);

  useEffect(() => {
    void loadCalendar(calendarMonth);
  }, [calendarMonth, loadCalendar]);

  const persistDailyReview = useCallback(
    async (date: Date, nextContent: string, existedBeforeEditing: boolean) => {
      const key = dateKey(date);
      if (
        loadedReview.current?.date !== key ||
        loadedReview.current.requestId !== loadRequestId.current
      )
        return false;
      setIsSaving(true);
      try {
        // 已存在的复盘即使清空正文也只更新为空，不再隐式删除历史记录。
        if (hasReviewContent(nextContent) || existedBeforeEditing) {
          const result = await updateDailyReview({ date: key, content: nextContent });
          if (!result.success) {
            throw new Error(result.message || '保存每日复盘失败。');
          }
          setCompletedDateKeys((keys) =>
            hasReviewContent(nextContent)
              ? [...new Set([...keys, key])]
              : keys.filter((item) => item !== key),
          );
        }
        return true;
      } catch {
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [],
  );

  const saveReview = async (nextContent: string) => {
    if (!canEdit) throw new Error('复盘尚未成功加载，请重试后再保存。');
    const saved = await persistDailyReview(
      selectedDate,
      nextContent,
      hasReviewContent(savedContent),
    );
    if (!saved) throw new Error('保存每日复盘失败。');
    setSavedContent(nextContent);
  };

  const handleDateSelect = async (date: Date | undefined) => {
    if (!date || isSaving) return;
    if (dateKey(date) === selectedDateKey) {
      setCalendarMonth(date);
      return;
    }
    // 切换日期前自动保存编辑标签中的未保存内容，避免草稿丢失。
    if (hasUnsavedChanges && loadedReview.current?.date === selectedDateKey) {
      const saved = await persistDailyReview(selectedDate, content, hasReviewContent(savedContent));
      if (!saved) return;
    }
    ++loadRequestId.current;
    loadedReview.current = null;
    setLoadedDateKey(null);
    setLoadError('');
    setIsLoading(true);
    setSelectedDate(date);
    setCalendarMonth(date);
  };

  const completedDates = useMemo(
    () => completedDateKeys.map((key) => new Date(`${key}T00:00:00`)),
    [completedDateKeys],
  );
  const openReport = REPORT_OPTIONS.find((item) => item.value === openReportType);

  return (
    <AppPage className="gap-5 bg-transparent p-0">
      <AppPageHeader title="复盘报告" />

      <AppWorkspace className="grid gap-5 overflow-visible bg-transparent xl:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <CalendarDays className="size-4" />
                日历
              </CardTitle>
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
              <LoaderCircle className="size-4 animate-spin" />
              正在加载日报…
            </div>
          ) : loadError ? (
            <div className="flex min-h-105 flex-col items-center justify-center gap-4 px-6 text-center">
              <p role="alert" className="max-w-md text-sm text-destructive">
                {loadError}
              </p>
              <Button variant="outline" onClick={() => void loadDailyReview(selectedDate)}>
                重新加载复盘
              </Button>
            </div>
          ) : (
            <MarkdownEditor
              className="h-full shadow-none"
              minHeight={480}
              disabled={!canEdit}
              onChange={setContent}
              onPolish={async (selection) => {
                const requestId = loadRequestId.current;
                if (!canEdit || loadedReview.current?.date !== selectedDateKey)
                  throw new Error('复盘尚未成功加载，暂时无法润色。');
                const chat = await createConversation('复盘文字润色');
                const result = await sendMessage(
                  chat.data.id,
                  '请润色以下复盘文本，保留原意，只返回润色结果：\n' + selection,
                );
                if (requestId !== loadRequestId.current)
                  throw new Error('所选日期已改变，请在当前复盘中重新润色。');
                return result.data.assistantMessage.content;
              }}
              onSave={saveReview}
              placeholder="记录今天完成的事、收获与明日计划……"
              value={content}
            />
          )}
        </main>

        <Dialog
          onOpenChange={(open) => !open && setOpenReportType(null)}
          open={openReportType !== null}
        >
          <DialogContent className="max-h-[calc(100dvh-2rem)] grid-rows-[auto_minmax(0,1fr)] overflow-hidden p-0 sm:max-w-5xl">
            {openReportType ? (
              <>
                <DialogHeader className="border-b px-6 py-5 pr-14">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <DialogTitle className="text-lg">
                        {openReport?.label} · {selectedDateKey} 所在周期
                      </DialogTitle>
                      <DialogDescription className="mt-2">
                        本周期内实际保存的复盘记录，可导出或生成 AI 总结
                      </DialogDescription>
                    </div>
                  </div>
                </DialogHeader>
                <div className="min-h-0 overflow-y-auto px-6 py-6">
                  <ReviewReport reportType={openReportType} date={selectedDateKey} />
                </div>
              </>
            ) : null}
          </DialogContent>
        </Dialog>
      </AppWorkspace>
    </AppPage>
  );
}
