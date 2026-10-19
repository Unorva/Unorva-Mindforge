import {
  Bell,
  BookOpen,
  Briefcase,
  CalendarCheck,
  CalendarClock,
  CalendarDays,
  HeartPulse,
  Lightbulb,
  LineChart,
  ListChecks,
  Mail,
  Newspaper,
  Radar,
  Sparkles,
  TrendingUp,
  UtensilsCrossed,
  Zap,
  type LucideIcon,
} from 'lucide-react';

/** 自动化任务可选的图标。 */
export const AUTOMATION_ICONS = {
  zap: Zap,
  sparkles: Sparkles,
  mail: Mail,
  newspaper: Newspaper,
  trending: TrendingUp,
  radar: Radar,
  'calendar-check': CalendarCheck,
  'calendar-days': CalendarDays,
  'calendar-clock': CalendarClock,
  list: ListChecks,
  'line-chart': LineChart,
  briefcase: Briefcase,
  book: BookOpen,
  lightbulb: Lightbulb,
  heart: HeartPulse,
  utensils: UtensilsCrossed,
  bell: Bell,
} satisfies Record<string, LucideIcon>;

export type AutomationIconKey = keyof typeof AUTOMATION_ICONS;

/** 自动化任务可选的图标底块颜色。 */
export const AUTOMATION_COLORS = [
  { key: 'blue', label: '蓝色', className: 'bg-blue-600' },
  { key: 'violet', label: '紫色', className: 'bg-violet-600' },
  { key: 'pink', label: '粉色', className: 'bg-pink-600' },
  { key: 'orange', label: '橙色', className: 'bg-orange-500' },
  { key: 'sky', label: '天蓝', className: 'bg-sky-600' },
  { key: 'emerald', label: '绿色', className: 'bg-emerald-600' },
  { key: 'rose', label: '玫红', className: 'bg-rose-500' },
  { key: 'slate', label: '深灰', className: 'bg-slate-700' },
] as const;

export type AutomationColorKey = (typeof AUTOMATION_COLORS)[number]['key'];

const ICON_KEYS = new Set<string>(Object.keys(AUTOMATION_ICONS));
const COLOR_KEYS = new Set<string>(AUTOMATION_COLORS.map((color) => color.key));

/** 读取图标，未知或缺失时回退到闪电图标。 */
export function automationIcon(key?: string): LucideIcon {
  return key && ICON_KEYS.has(key)
    ? AUTOMATION_ICONS[key as AutomationIconKey]
    : AUTOMATION_ICONS.zap;
}

export function normalizeAutomationIconKey(key?: string): AutomationIconKey {
  return key && ICON_KEYS.has(key) ? (key as AutomationIconKey) : 'zap';
}

export function normalizeAutomationColorKey(key?: string): AutomationColorKey {
  return key && COLOR_KEYS.has(key) ? (key as AutomationColorKey) : 'blue';
}

/** 读取图标底块颜色类，未知或缺失时回退到蓝色。 */
export function automationColorClass(key?: string): string {
  return automationColorClassOf(normalizeAutomationColorKey(key));
}

function automationColorClassOf(key: AutomationColorKey): string {
  return AUTOMATION_COLORS.find((color) => color.key === key)?.className ?? 'bg-blue-600';
}
