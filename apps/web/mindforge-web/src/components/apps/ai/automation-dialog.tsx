import { useEffect, useId, useState } from 'react';
import {
  Bell,
  Cable,
  CalendarClock,
  Grid2x2,
  Loader2,
  Mail,
  Pencil,
  Plus,
  Trash2,
  Zap,
} from 'lucide-react';
import { getCurrentUser } from '@/api/system/users/users';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
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
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/toast';
import { cn } from '@/lib/utils';
import {
  AUTOMATION_CATEGORIES,
  type AutomationTemplate,
} from './automation-templates';
import {
  describeAutomationSchedule,
  isFutureAutomationTime,
  isValidDate,
  readAutomationTasks,
  WEEK_DAYS,
  writeAutomationTasks,
  type AutomationFrequency,
  type AutomationSpeed,
  type AutomationTask,
} from './automation-storage';

const SPEED_OPTIONS: { value: AutomationSpeed; label: string }[] = [
  { value: 'fast', label: 'Fast' },
  { value: 'standard', label: 'Standard' },
  { value: 'deep', label: 'Deep' },
];

interface EditorDraft {
  title: string;
  prompt: string;
  triggerEnabled: boolean;
  frequency: AutomationFrequency;
  date: string;
  time: string;
  weekDay: number;
  timeZone: string;
  speed: AutomationSpeed;
  notifyApp: boolean;
  notifyEmail: boolean;
}

interface EditorState {
  open: boolean;
  task?: AutomationTask;
  template?: AutomationTemplate;
}

function defaultSchedule() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const date = [
    tomorrow.getFullYear(),
    String(tomorrow.getMonth() + 1).padStart(2, '0'),
    String(tomorrow.getDate()).padStart(2, '0'),
  ].join('-');
  return {
    frequency: 'daily' as AutomationFrequency,
    date,
    time: '09:00',
    weekDay: 1,
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Shanghai',
  };
}

function emptyDraft(): EditorDraft {
  return {
    title: '',
    prompt: '',
    triggerEnabled: false,
    speed: 'fast',
    notifyApp: true,
    notifyEmail: true,
    ...defaultSchedule(),
  };
}

function draftFromTemplate(template: AutomationTemplate): EditorDraft {
  return { ...emptyDraft(), title: template.title, prompt: template.prompt };
}

function draftFromTask(task: AutomationTask): EditorDraft {
  return {
    title: task.title,
    prompt: task.prompt,
    triggerEnabled: true,
    frequency: task.frequency,
    date: task.date,
    time: task.time,
    weekDay: task.weekDay,
    timeZone: task.timeZone,
    speed: task.speed ?? 'fast',
    notifyApp: task.notifyApp ?? true,
    notifyEmail: task.notifyEmail ?? true,
  };
}

function AutomationEditorDialog({
  open,
  onOpenChange,
  task,
  template,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task?: AutomationTask;
  template?: AutomationTemplate;
  onSave: (task: AutomationTask) => boolean;
}) {
  const fieldId = useId();
  const [draft, setDraft] = useState<EditorDraft>(emptyDraft);

  useEffect(() => {
    if (!open) return;
    setDraft(task ? draftFromTask(task) : template ? draftFromTemplate(template) : emptyDraft());
  }, [open, task, template]);

  const change = <K extends keyof EditorDraft>(key: K, value: EditorDraft[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const previewTask: AutomationTask = {
    id: 'preview',
    title: draft.title,
    prompt: draft.prompt,
    frequency: draft.frequency,
    date: draft.date,
    time: draft.time,
    weekDay: draft.weekDay,
    timeZone: draft.timeZone,
  };

  const canSave = Boolean(
    draft.title.trim() && draft.prompt.trim() && draft.triggerEnabled,
  );

  const handleSave = () => {
    if (!canSave) return;
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(draft.time)) {
      toast.add({ type: 'error', title: '请选择有效的执行时间' });
      return;
    }
    if (draft.frequency === 'once') {
      if (!isValidDate(draft.date)) {
        toast.add({ type: 'error', title: '请选择有效的执行日期' });
        return;
      }
      if (!isFutureAutomationTime(draft)) {
        toast.add({ type: 'error', title: '单次任务的执行时间需要晚于当前时间' });
        return;
      }
    }
    const next: AutomationTask = {
      id: task?.id ?? crypto.randomUUID(),
      title: draft.title.trim(),
      prompt: draft.prompt.trim(),
      frequency: draft.frequency,
      date: draft.date,
      time: draft.time,
      weekDay: draft.weekDay,
      timeZone: draft.timeZone,
      speed: draft.speed,
      notifyApp: draft.notifyApp,
      notifyEmail: draft.notifyEmail,
    };
    if (onSave(next)) onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] gap-0 overflow-y-auto p-0 sm:max-w-[34rem]">
        <div className="space-y-5 p-6">
          <DialogHeader className="pr-8">
            <DialogTitle className="text-base font-medium">
              {task ? '编辑自动化' : '新建自动化'}
            </DialogTitle>
            <DialogDescription className="sr-only">
              设置名称、触发器和指令，保存后会出现在运行列表中。
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-foreground text-background">
              <Zap className="size-5" />
            </span>
            <Input
              aria-label="自动化名称"
              className="h-11"
              maxLength={80}
              placeholder="我的自动化任务"
              value={draft.title}
              onChange={(event) => change('title', event.target.value)}
            />
          </div>

          <FieldGroup className="gap-5">
            <Field>
              <FieldLabel>触发器</FieldLabel>
              {!draft.triggerEnabled ? (
                <Button
                  type="button"
                  className="h-10 w-full justify-start gap-2 border-dashed bg-muted/30 font-normal text-muted-foreground"
                  variant="outline"
                  onClick={() => change('triggerEnabled', true)}
                >
                  <Plus className="size-4" />
                  添加触发器
                </Button>
              ) : (
                <div className="space-y-3 rounded-xl border bg-muted/20 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex min-w-0 items-center gap-2 text-sm">
                      <CalendarClock className="size-4 shrink-0 text-muted-foreground" />
                      <span className="truncate">{describeAutomationSchedule(previewTask)}</span>
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => change('triggerEnabled', false)}
                    >
                      移除
                    </Button>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor={`${fieldId}-frequency`}>重复频率</Label>
                      <Select
                        items={{ once: '仅一次', daily: '每天', weekly: '每周' }}
                        value={draft.frequency}
                        onValueChange={(value) => {
                          if (value) change('frequency', value as AutomationFrequency);
                        }}
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
                    <div className="space-y-1.5">
                      <Label htmlFor={`${fieldId}-time`}>执行时间</Label>
                      <Input
                        id={`${fieldId}-time`}
                        type="time"
                        value={draft.time}
                        onChange={(event) => change('time', event.target.value)}
                      />
                    </div>
                    {draft.frequency === 'once' && (
                      <div className="space-y-1.5 sm:col-span-2">
                        <Label htmlFor={`${fieldId}-date`}>执行日期</Label>
                        <Input
                          id={`${fieldId}-date`}
                          type="date"
                          value={draft.date}
                          onChange={(event) => change('date', event.target.value)}
                        />
                      </div>
                    )}
                    {draft.frequency === 'weekly' && (
                      <div className="space-y-1.5 sm:col-span-2">
                        <Label htmlFor={`${fieldId}-weekday`}>执行日</Label>
                        <Select
                          items={Object.fromEntries(
                            WEEK_DAYS.map((day, index) => [String(index), day]),
                          )}
                          value={String(draft.weekDay)}
                          onValueChange={(value) => {
                            if (value !== null) change('weekDay', Number(value));
                          }}
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
                  <p className="text-xs text-muted-foreground">
                    时间按浏览器时区 {draft.timeZone} 保存。
                  </p>
                </div>
              )}
            </Field>

            <Field>
              <FieldLabel htmlFor={`${fieldId}-prompt`}>指令</FieldLabel>
              <div className="overflow-hidden rounded-xl border bg-card">
                <Textarea
                  id={`${fieldId}-prompt`}
                  className="min-h-32 resize-none border-0 bg-transparent shadow-none focus-visible:ring-0"
                  maxLength={10000}
                  placeholder="阅读我的未读邮件并总结..."
                  value={draft.prompt}
                  onChange={(event) => change('prompt', event.target.value)}
                />
                <div className="flex items-center gap-3 border-t px-3 py-2">
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    aria-label="添加指令组件"
                    onClick={() =>
                      toast.add({
                        type: 'info',
                        title: '更多指令组件即将开放',
                        description: '后续可以在这里插入连接器与技能。',
                      })
                    }
                  >
                    <Plus />
                  </Button>
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <Cable className="size-3.5" />
                    连接器 0
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <Grid2x2 className="size-3.5" />
                    技能 0
                  </span>
                  <div className="ml-auto w-28">
                    <Select
                      items={Object.fromEntries(
                        SPEED_OPTIONS.map((option) => [option.value, option.label]),
                      )}
                      value={draft.speed}
                      onValueChange={(value) => {
                        if (value) change('speed', value as AutomationSpeed);
                      }}
                    >
                      <SelectTrigger
                        aria-label="生成速度"
                        className="w-full"
                        size="sm"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SPEED_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </Field>

            <Field>
              <FieldLabel>Notifications</FieldLabel>
              <div className="overflow-hidden rounded-xl border bg-card">
                <div className="flex items-center gap-3 border-b px-3 py-2.5">
                  <Bell className="size-4 shrink-0 text-muted-foreground" />
                  <span className="flex-1 text-sm">App</span>
                  <Switch
                    aria-label="App 通知"
                    checked={draft.notifyApp}
                    onCheckedChange={(checked) => change('notifyApp', checked)}
                  />
                </div>
                <div className="flex items-center gap-3 px-3 py-2.5">
                  <Mail className="size-4 shrink-0 text-muted-foreground" />
                  <span className="flex-1 text-sm">Email</span>
                  <Switch
                    aria-label="邮件通知"
                    checked={draft.notifyEmail}
                    onCheckedChange={(checked) => change('notifyEmail', checked)}
                  />
                </div>
              </div>
            </Field>
          </FieldGroup>
        </div>

        <DialogFooter className="border-t px-6 py-4 sm:justify-between">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button type="button" disabled={!canSave} onClick={handleSave}>
            保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
  const [tasks, setTasks] = useState<AutomationTask[]>([]);
  const [taskError, setTaskError] = useState('');
  const [tab, setTab] = useState('templates');
  const [editor, setEditor] = useState<EditorState>({ open: false });
  const [deleteTarget, setDeleteTarget] = useState<AutomationTask | null>(null);

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

  useEffect(() => {
    if (!open || userId === null) {
      setTasks([]);
      setTaskError('');
      return;
    }
    try {
      setTasks(readAutomationTasks(userId));
      setTaskError('');
    } catch {
      setTasks([]);
      setTaskError('无法读取本地自动化配置，请检查浏览器存储权限后重新打开。');
    }
  }, [open, userId]);

  const saveTask = (task: AutomationTask): boolean => {
    if (userId === null) return false;
    try {
      const exists = tasks.some((item) => item.id === task.id);
      const next = exists
        ? tasks.map((item) => (item.id === task.id ? task : item))
        : [task, ...tasks];
      writeAutomationTasks(userId, next);
      setTasks(next);
      setTaskError('');
      toast.add({
        type: 'success',
        title: exists ? '自动化任务已更新' : '自动化任务已创建',
        description: '配置保存在此浏览器，定时调度服务接入后自动执行。',
      });
      return true;
    } catch {
      toast.add({
        type: 'error',
        title: '保存失败',
        description: '请检查浏览器存储权限或可用空间。',
      });
      return false;
    }
  };

  const removeTask = (id: string) => {
    if (userId === null) return;
    try {
      const next = tasks.filter((item) => item.id !== id);
      writeAutomationTasks(userId, next);
      setTasks(next);
      toast.add({ type: 'success', title: '自动化任务已删除' });
    } catch {
      toast.add({
        type: 'error',
        title: '删除失败',
        description: '请检查浏览器存储权限或可用空间。',
      });
    }
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setEditor({ open: false });
      setDeleteTarget(null);
    }
    onOpenChange(next);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent
          showCloseButton={false}
          className="flex h-[min(48rem,calc(100dvh-3rem))] w-[calc(100vw-2rem)] max-w-[calc(100%-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-5xl"
        >
          <DialogTitle className="sr-only">自动化任务</DialogTitle>
          <DialogDescription className="sr-only">
            浏览自动化模板，或管理已保存的自动化任务。
          </DialogDescription>

          <Tabs
            className="flex min-h-0 flex-1 flex-col gap-0"
            value={tab}
            onValueChange={(value) => setTab(String(value))}
          >
            <div className="flex items-center gap-3 px-6 pt-5 pb-2">
              <TabsList className="h-9! gap-1 bg-transparent p-0">
                <TabsTrigger
                  className="h-9! flex-none rounded-full px-4 text-muted-foreground data-active:bg-muted data-active:text-foreground data-active:shadow-none"
                  value="templates"
                >
                  自动化任务
                </TabsTrigger>
                <TabsTrigger
                  className="h-9! flex-none rounded-full px-4 text-muted-foreground data-active:bg-muted data-active:text-foreground data-active:shadow-none"
                  value="runs"
                >
                  运行{tasks.length > 0 ? ` (${tasks.length})` : ''}
                </TabsTrigger>
              </TabsList>
              <Button
                className="ml-auto shrink-0 rounded-full px-4"
                size="lg"
                onClick={() => setEditor({ open: true })}
              >
                新建自动化
              </Button>
            </div>

            <ScrollArea className="min-h-0 flex-1">
              <div className="px-6 pb-8">
                <TabsContent className="m-0" value="templates">
                  {loading ? (
                    <p
                      className="flex items-center justify-center gap-2 py-16 text-muted-foreground"
                      role="status"
                    >
                      <Loader2 className="size-4 animate-spin" />
                      正在读取自动化模板…
                    </p>
                  ) : failed ? (
                    <div className="space-y-3 py-10">
                      <p className="text-sm text-destructive" role="alert">
                        无法确认当前账号，请重试。
                      </p>
                      <Button
                        variant="outline"
                        onClick={() => setAttempt((value) => value + 1)}
                      >
                        重新加载
                      </Button>
                    </div>
                  ) : (
                    AUTOMATION_CATEGORIES.map((category) => (
                      <section key={category.name} className="pt-4">
                        <h3 className="pb-2 text-base font-semibold">{category.name}</h3>
                        <div className="grid grid-cols-1 gap-x-8 md:grid-cols-2">
                          {category.templates.map((template) => (
                            <div
                              key={template.id}
                              className="-mx-2 flex items-center gap-3 rounded-lg px-2 py-3 transition-colors hover:bg-muted/60"
                            >
                              <span
                                className={cn(
                                  'flex size-8 shrink-0 items-center justify-center rounded-lg text-white',
                                  category.colorClass,
                                )}
                              >
                                <template.icon className="size-4" />
                              </span>
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium">
                                  {template.title}
                                </p>
                                <p className="truncate text-xs text-muted-foreground">
                                  {template.description}
                                </p>
                              </div>
                              <Button
                                aria-label={`添加${template.title}自动化`}
                                className="shrink-0 rounded-full px-3.5"
                                size="sm"
                                variant="secondary"
                                onClick={() => setEditor({ open: true, template })}
                              >
                                添加
                              </Button>
                            </div>
                          ))}
                        </div>
                      </section>
                    ))
                  )}
                </TabsContent>

                <TabsContent className="m-0" value="runs">
                  {taskError && (
                    <p className="py-3 text-sm text-destructive" role="alert">
                      {taskError}
                    </p>
                  )}
                  {tasks.length === 0 ? (
                    <Empty className="py-16">
                      <EmptyHeader>
                        <EmptyMedia variant="icon">
                          <CalendarClock />
                        </EmptyMedia>
                        <EmptyTitle>还没有自动化任务</EmptyTitle>
                        <EmptyDescription>
                          从模板添加，或创建自己的自动化任务。
                        </EmptyDescription>
                      </EmptyHeader>
                      <EmptyContent>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditor({ open: true })}
                        >
                          新建自动化
                        </Button>
                      </EmptyContent>
                    </Empty>
                  ) : (
                    tasks.map((task) => (
                      <div
                        key={task.id}
                        className="-mx-2 flex items-center gap-3 rounded-lg px-2 py-3 transition-colors hover:bg-muted/60"
                      >
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                          <CalendarClock className="size-4" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{task.title}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {describeAutomationSchedule(task)}
                          </p>
                        </div>
                        <Badge className="shrink-0" variant="secondary">
                          待接入调度
                        </Badge>
                        <Button
                          aria-label={`编辑 ${task.title}`}
                          size="icon-sm"
                          variant="ghost"
                          onClick={() => setEditor({ open: true, task })}
                        >
                          <Pencil />
                        </Button>
                        <Button
                          aria-label={`删除 ${task.title}`}
                          className="text-destructive hover:text-destructive"
                          size="icon-sm"
                          variant="ghost"
                          onClick={() => setDeleteTarget(task)}
                        >
                          <Trash2 />
                        </Button>
                      </div>
                    ))
                  )}
                </TabsContent>
              </div>
            </ScrollArea>
          </Tabs>
        </DialogContent>
      </Dialog>

      <AutomationEditorDialog
        open={editor.open}
        onOpenChange={(next) => setEditor((current) => ({ ...current, open: next }))}
        task={editor.task}
        template={editor.template}
        onSave={saveTask}
      />

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(next) => {
          if (!next) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除这个自动化？</AlertDialogTitle>
            <AlertDialogDescription>
              「{deleteTarget?.title}」将从本地配置中移除，操作不可撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteTarget) removeTask(deleteTarget.id);
                setDeleteTarget(null);
              }}
            >
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
