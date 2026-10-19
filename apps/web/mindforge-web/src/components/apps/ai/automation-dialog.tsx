import { useEffect, useId, useState, type SubmitEvent } from 'react';
import { CalendarClock, Clock3, FileText, Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import { getCurrentUser } from '@/api/system/users/users';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/toast';
import {
  describeAutomationSchedule,
  isFutureAutomationTime,
  isValidDate,
  readAutomationTasks,
  WEEK_DAYS,
  writeAutomationTasks,
  type AutomationFrequency,
  type AutomationTask,
} from './automation-storage';

type AutomationDraft = Omit<AutomationTask, 'id'>;

function newDraft(): AutomationDraft {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const date = [
    tomorrow.getFullYear(),
    String(tomorrow.getMonth() + 1).padStart(2, '0'),
    String(tomorrow.getDate()).padStart(2, '0'),
  ].join('-');
  return {
    title: '',
    prompt: '',
    frequency: 'daily',
    date,
    time: '09:00',
    weekDay: 1,
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Shanghai',
  };
}

function AutomationSettings({ userId, onClose }: { userId: number; onClose: () => void }) {
  const fieldId = useId();
  const [initial] = useState(() => {
    try {
      return { tasks: readAutomationTasks(userId), error: '' };
    } catch {
      return { tasks: [], error: '无法读取本地任务配置，请检查浏览器存储权限后重新打开弹窗。' };
    }
  });
  const [tasks, setTasks] = useState(initial.tasks);
  const [draft, setDraft] = useState<AutomationDraft>(newDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [tab, setTab] = useState('create');
  const [error, setError] = useState(initial.error);

  const change = <K extends keyof AutomationDraft>(key: K, value: AutomationDraft[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setError('');
  };

  const persist = (next: AutomationTask[]) => {
    try {
      writeAutomationTasks(userId, next);
      setTasks(next);
      setError('');
      return true;
    } catch {
      setError('保存失败，请检查浏览器存储权限或可用空间。当前输入已保留。');
      return false;
    }
  };

  const resetDraft = () => {
    setDraft(newDraft());
    setEditingId(null);
    setError('');
  };

  const save = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (initial.error) return;
    if (!draft.title.trim() || !draft.prompt.trim()) {
      setError('请填写任务名称和提示词。');
      return;
    }
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(draft.time)) {
      setError('请选择有效的执行时间。');
      return;
    }
    if (draft.frequency === 'once') {
      if (!isValidDate(draft.date)) {
        setError('请选择有效的执行日期。');
        return;
      }
      if (!isFutureAutomationTime(draft)) {
        setError('单次任务的执行时间需要晚于当前时间。');
        return;
      }
    }
    const task: AutomationTask = {
      ...draft,
      title: draft.title.trim(),
      prompt: draft.prompt.trim(),
      id: editingId ?? crypto.randomUUID(),
    };
    const next = editingId
      ? tasks.map((item) => (item.id === editingId ? task : item))
      : [task, ...tasks];
    if (!persist(next)) return;
    toast.add({
      type: 'success',
      title: editingId ? '任务配置已更新' : '任务配置已保存',
      description: '配置已保存在此浏览器，等待接入定时调度服务。',
    });
    resetDraft();
    setTab('saved');
  };

  return (
    <>
      <div className="flex items-start gap-3 rounded-xl border bg-muted/30 p-3 text-sm text-muted-foreground">
        <Clock3 className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <p className="leading-6">
          配置仅保存在当前账号的此浏览器中。定时调度服务尚未接入，保存后不会自动执行。
        </p>
      </div>
      <Tabs
        value={tab}
        onValueChange={(value) => {
          setTab(String(value));
          setDeletingId(null);
        }}
        className="min-h-0 flex-col gap-4"
      >
        <TabsList className="h-9 w-full shrink-0 sm:w-fit">
          <TabsTrigger value="create">
            <Plus />
            {editingId ? '编辑任务' : '新建任务'}
          </TabsTrigger>
          <TabsTrigger value="saved">
            <FileText />
            已保存{tasks.length > 0 && ` (${tasks.length})`}
          </TabsTrigger>
        </TabsList>
        {(error || initial.error) && (
          <p className="text-sm text-destructive" role="alert">
            {error || initial.error}
          </p>
        )}
        <TabsContent value="create">
          <form onSubmit={save} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor={`${fieldId}-title`}>任务名称</Label>
              <Input
                id={`${fieldId}-title`}
                value={draft.title}
                onChange={(event) => change('title', event.target.value)}
                placeholder="例如：每日工作计划"
                maxLength={80}
                required
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor={`${fieldId}-prompt`}>提示词</Label>
                <span className="text-xs tabular-nums text-muted-foreground">
                  {draft.prompt.length} / 10000
                </span>
              </div>
              <Textarea
                id={`${fieldId}-prompt`}
                className="min-h-32 max-h-56 resize-y"
                value={draft.prompt}
                onChange={(event) => change('prompt', event.target.value)}
                placeholder="描述希望助手完成的任务，例如：根据我提供的待办事项，整理今天的工作计划，按优先级列出行动建议。"
                maxLength={10000}
                required
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor={`${fieldId}-frequency`}>重复频率</Label>
                <Select
                  value={draft.frequency}
                  onValueChange={(value) => {
                    if (value) change('frequency', value as AutomationFrequency);
                  }}
                  items={{ once: '仅一次', daily: '每天', weekly: '每周' }}
                >
                  <SelectTrigger id={`${fieldId}-frequency`} className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="once">仅一次</SelectItem>
                    <SelectItem value="daily">每天</SelectItem>
                    <SelectItem value="weekly">每周</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor={`${fieldId}-time`}>执行时间</Label>
                <Input
                  id={`${fieldId}-time`}
                  type="time"
                  value={draft.time}
                  onChange={(event) => change('time', event.target.value)}
                  required
                />
              </div>
              {draft.frequency === 'once' && (
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor={`${fieldId}-date`}>执行日期</Label>
                  <Input
                    id={`${fieldId}-date`}
                    type="date"
                    value={draft.date}
                    onChange={(event) => change('date', event.target.value)}
                    required
                  />
                </div>
              )}
              {draft.frequency === 'weekly' && (
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor={`${fieldId}-weekday`}>执行日</Label>
                  <Select
                    value={String(draft.weekDay)}
                    onValueChange={(value) => {
                      if (value !== null) change('weekDay', Number(value));
                    }}
                    items={Object.fromEntries(WEEK_DAYS.map((day, index) => [String(index), day]))}
                  >
                    <SelectTrigger id={`${fieldId}-weekday`} className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {WEEK_DAYS.map((day, index) => (
                        <SelectItem key={day} value={String(index)}>
                          {day}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <div className="space-y-1 rounded-lg bg-muted/40 p-3 text-xs leading-5 text-muted-foreground">
              <p>计划：{describeAutomationSchedule({ ...draft, id: 'preview' })}</p>
              <p>时间按创建任务时的浏览器时区保存。</p>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={editingId ? resetDraft : onClose}>
                {editingId ? '取消编辑' : '取消'}
              </Button>
              <Button
                type="submit"
                disabled={Boolean(initial.error) || !draft.title.trim() || !draft.prompt.trim()}
              >
                <CalendarClock />
                {editingId ? '保存修改' : '保存任务配置'}
              </Button>
            </DialogFooter>
          </form>
        </TabsContent>
        <TabsContent value="saved" className="space-y-3">
          {tasks.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed px-4 py-10 text-center">
              <CalendarClock className="size-8 text-muted-foreground" />
              <p className="font-medium">还没有任务配置</p>
              <p className="text-sm text-muted-foreground">
                设置提示词与时间，保存你的第一个自动化计划。
              </p>
              <Button variant="outline" onClick={() => setTab('create')}>
                <Plus />
                新建任务
              </Button>
            </div>
          ) : (
            tasks.map((task) => (
              <article key={task.id} className="space-y-3 rounded-xl border p-4">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="min-w-0 break-words font-medium">{task.title}</h3>
                  <Badge variant="secondary">待接入调度</Badge>
                </div>
                <p className="line-clamp-3 whitespace-pre-wrap break-words text-sm leading-6 text-muted-foreground">
                  {task.prompt}
                </p>
                <p className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock3 className="size-3.5 shrink-0" />
                  {describeAutomationSchedule(task)}
                </p>
                <div className="flex flex-wrap items-center justify-end gap-2">
                  {deletingId === task.id ? (
                    <>
                      <span className="mr-auto text-xs text-destructive">删除此任务配置？</span>
                      <Button size="sm" variant="outline" onClick={() => setDeletingId(null)}>
                        取消
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          if (persist(tasks.filter((item) => item.id !== task.id))) {
                            setDeletingId(null);
                            if (editingId === task.id) resetDraft();
                          }
                        }}
                      >
                        确认删除
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        size="sm"
                        variant="ghost"
                        aria-label={`编辑任务 ${task.title}`}
                        onClick={() => {
                          setDraft(task);
                          setEditingId(task.id);
                          setError('');
                          setTab('create');
                        }}
                      >
                        <Pencil />
                        编辑
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        aria-label={`删除任务 ${task.title}`}
                        onClick={() => setDeletingId(task.id)}
                      >
                        <Trash2 />
                        删除
                      </Button>
                    </>
                  )}
                </div>
              </article>
            ))
          )}
        </TabsContent>
      </Tabs>
    </>
  );
}

export default function AutomationDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [userId, setUserId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setUserId(null);
    setFailed(false);
    void getCurrentUser()
      .then((result) => {
        if (!Number.isSafeInteger(result.data.id) || result.data.id <= 0) {
          throw new Error('Invalid current user');
        }
        if (!cancelled) setUserId(result.data.id);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, attempt]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-xl">
        <DialogHeader className="pr-7">
          <DialogTitle className="flex items-center gap-2">
            <CalendarClock className="size-5 text-primary" />
            自动化任务
          </DialogTitle>
          <DialogDescription>为重复的工作设置提示词与计划时间。</DialogDescription>
        </DialogHeader>
        {loading ? (
          <p
            className="flex items-center justify-center gap-2 py-10 text-muted-foreground"
            role="status"
          >
            <Loader2 className="size-4 animate-spin" />
            正在读取任务配置…
          </p>
        ) : failed || userId === null ? (
          <div className="space-y-4 py-4">
            <p role="alert" className="text-sm text-destructive">
              无法确认当前账号，请重试。
            </p>
            <Button variant="outline" onClick={() => setAttempt((value) => value + 1)}>
              重新加载
            </Button>
          </div>
        ) : (
          <AutomationSettings key={userId} userId={userId} onClose={() => onOpenChange(false)} />
        )}
      </DialogContent>
    </Dialog>
  );
}
