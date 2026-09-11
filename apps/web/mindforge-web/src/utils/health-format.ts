import type { HealthRange, MetricValueFormat } from '@/types/apps/health'

const rangeLabels: Record<HealthRange, string> = {
  day: '今日',
  week: '近 7 天',
  month: '近 30 天',
  sixMonths: '近 6 个月',
  year: '近 1 年',
}

export function getRangeLabel(range: HealthRange) {
  return rangeLabels[range]
}

/** 时刻类指标以「偏移小时数」存储，展示时叠加偏移并格式化为 HH:mm */
export function formatClockHour(value: number, timeShift = 0) {
  const total = ((value + timeShift) % 24 + 24) % 24
  const hours = Math.floor(total)
  const minutes = Math.round((total - hours) * 60)
  const normalizedMinutes = minutes === 60 ? 0 : minutes
  const normalizedHours = minutes === 60 ? (hours + 1) % 24 : hours
  return `${String(normalizedHours).padStart(2, '0')}:${String(normalizedMinutes).padStart(2, '0')}`
}

export function formatHealthValue(
  value: number,
  decimals = 0,
  format: MetricValueFormat = 'number',
  timeShift = 0,
) {
  if (!Number.isFinite(value)) return '--'
  if (format === 'time') return formatClockHour(value, timeShift)
  return value.toLocaleString('zh-CN', {
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals,
  })
}

export function formatChangePercent(percent: number) {
  if (!Number.isFinite(percent)) return '--'
  const sign = percent > 0 ? '+' : ''
  return `${sign}${percent.toFixed(1)}%`
}

export function formatDuration(minutes: number) {
  const total = Math.round(minutes)
  const hours = Math.floor(total / 60)
  const rest = total % 60
  if (!hours) return `${rest} 分钟`
  return rest ? `${hours} 小时 ${rest} 分钟` : `${hours} 小时`
}

export function formatDate(dateKey: string) {
  const date = new Date(`${dateKey}T00:00:00`)
  if (Number.isNaN(date.getTime())) return dateKey
  return new Intl.DateTimeFormat('zh-CN', { month: 'long', day: 'numeric' }).format(date)
}

export function formatDateTime(iso: string) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date)
}
