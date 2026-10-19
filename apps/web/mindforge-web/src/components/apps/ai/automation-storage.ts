export type AutomationFrequency = 'once' | 'daily' | 'weekly';

export type AutomationSpeed = 'fast' | 'standard' | 'deep';

export interface AutomationTask {
  id: string;
  title: string;
  prompt: string;
  frequency: AutomationFrequency;
  date: string;
  time: string;
  weekDay: number;
  timeZone: string;
  /** 生成速度偏好，旧数据缺省时按 fast 处理。 */
  speed?: AutomationSpeed;
  /** 是否推送 App 通知，旧数据缺省时开启。 */
  notifyApp?: boolean;
  /** 是否推送邮件通知，旧数据缺省时开启。 */
  notifyEmail?: boolean;
}

export const WEEK_DAYS = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];

export function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function isFutureAutomationTime(
  task: Pick<AutomationTask, 'date' | 'time' | 'timeZone'>,
): boolean {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: task.timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date());
  const part = (type: string) => parts.find((item) => item.type === type)?.value;
  const current = `${part('year')}-${part('month')}-${part('day')}T${part('hour')}:${part('minute')}`;
  return `${task.date}T${task.time}` > current;
}

function isAutomationTask(value: unknown): value is AutomationTask {
  if (typeof value !== 'object' || value === null) return false;
  const task = value as Partial<AutomationTask>;
  if (
    typeof task.id !== 'string' ||
    !task.id ||
    typeof task.title !== 'string' ||
    !task.title.trim() ||
    task.title.length > 80 ||
    typeof task.prompt !== 'string' ||
    !task.prompt.trim() ||
    task.prompt.length > 10000 ||
    !['once', 'daily', 'weekly'].includes(task.frequency ?? '') ||
    typeof task.date !== 'string' ||
    (task.frequency === 'once' && !isValidDate(task.date)) ||
    typeof task.time !== 'string' ||
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(task.time) ||
    typeof task.weekDay !== 'number' ||
    !Number.isInteger(task.weekDay) ||
    task.weekDay < 0 ||
    task.weekDay > 6 ||
    typeof task.timeZone !== 'string' ||
    !task.timeZone
  )
    return false;
  if (task.speed !== undefined && !['fast', 'standard', 'deep'].includes(task.speed)) return false;
  if (task.notifyApp !== undefined && typeof task.notifyApp !== 'boolean') return false;
  if (task.notifyEmail !== undefined && typeof task.notifyEmail !== 'boolean') return false;
  try {
    new Intl.DateTimeFormat('zh-CN', { timeZone: task.timeZone });
    return true;
  } catch {
    return false;
  }
}

export function automationStorageKey(userId: number): string {
  return `mindforge.ai.automations.v1.${userId}`;
}

export function readAutomationTasks(userId: number): AutomationTask[] {
  const raw = localStorage.getItem(automationStorageKey(userId));
  if (raw === null) return [];
  const value: unknown = JSON.parse(raw);
  if (!Array.isArray(value) || !value.every(isAutomationTask)) {
    throw new Error('Invalid automation configuration');
  }
  const ids = new Set(value.map((task) => task.id));
  if (ids.size !== value.length) throw new Error('Duplicate automation configuration');
  return value;
}

export function writeAutomationTasks(userId: number, tasks: AutomationTask[]): void {
  localStorage.setItem(automationStorageKey(userId), JSON.stringify(tasks));
}

export function describeAutomationSchedule(task: AutomationTask): string {
  const frequency =
    task.frequency === 'once'
      ? task.date.replace(/-/g, '/')
      : task.frequency === 'daily'
        ? '每天'
        : `每周${WEEK_DAYS[task.weekDay].slice(2)}`;
  return `${frequency} ${task.time} · ${task.timeZone}`;
}
