import { Area, AreaChart } from 'recharts'
import { Minus, TrendingDown, TrendingUp } from 'lucide-react'

import { ChartContainer } from '@/components/ui/chart'
import { DashboardCard } from '@/components/shared/dashboard-card'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { formatChangePercent, formatHealthValue } from '@/utils/health-format'
import type { HealthMetric, MetricStatus, MetricTrend } from '@/types/apps/health'

import { categoryIcons, metricIcons } from './metric-icons'

const statusClass: Record<MetricStatus, string> = {
  good: 'bg-emerald-500',
  watch: 'bg-amber-500',
  alert: 'bg-red-500',
}

const statusText: Record<MetricStatus, string> = {
  good: '正常',
  watch: '需关注',
  alert: '超出参考范围',
}

function MetricIcon({ metric, className }: { metric: HealthMetric; className?: string }) {
  const Icon = metricIcons[metric.id] ?? categoryIcons[metric.category]
  return <Icon className={className} size={14} />
}

/** 指标状态圆点，悬浮可查看参考范围说明 */
export function MetricStatusDot({ metric }: { metric: HealthMetric }) {
  const description = metric.reference?.label ?? (metric.goal ? `目标 ${formatHealthValue(metric.goal, metric.decimals)} ${metric.unit}` : '暂无参考范围')
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger aria-label={`${metric.name}状态：${statusText[metric.status]}`} className="flex cursor-help items-center gap-1.5 rounded-full px-1 py-0.5 text-[11px] text-muted-foreground">
          <span className={cn('size-1.5 shrink-0 rounded-full', statusClass[metric.status])} />
          {statusText[metric.status]}
        </TooltipTrigger>
        <TooltipContent>{description}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

/** 环比变化标记，颜色区分「变化方向」是否有利 */
export function MetricTrendBadge({ changePercent, className, lowerIsBetter, trend }: { changePercent: number; className?: string; lowerIsBetter?: boolean; trend: MetricTrend }) {
  if (trend === 'flat') {
    return <span className={cn('inline-flex items-center gap-0.5 text-xs font-medium text-muted-foreground', className)}><Minus size={13} />持平</span>
  }
  const favourable = lowerIsBetter ? trend === 'down' : trend === 'up'
  const Icon = trend === 'up' ? TrendingUp : TrendingDown
  return (
    <span className={cn('inline-flex items-center gap-0.5 text-xs font-medium', favourable ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400', className)}>
      <Icon size={13} />{formatChangePercent(changePercent)}
    </span>
  )
}

export function MetricTile({ className, metric }: { className?: string; metric: HealthMetric }) {
  const display = metric.latest ?? { label: metric.rangeLabel, value: metric.current }
  const series = metric.series.map((point) => ({ label: point.label, value: point.value }))
  return (
    <DashboardCard className={cn('group/tile', className)}>
      <div className="flex flex-col gap-2.5 p-4">
        <div className="flex items-start justify-between gap-2">
          <span className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
            <MetricIcon className="shrink-0 text-foreground/70" metric={metric} />
            <span className="truncate">{metric.name}</span>
          </span>
          <MetricStatusDot metric={metric} />
        </div>
        <div className="flex items-end gap-1">
          <span className="text-xl leading-7 font-semibold tracking-tight tabular-nums">
            {formatHealthValue(display.value, metric.decimals, metric.valueFormat, metric.timeShift)}
          </span>
          {metric.unit && <span className="pb-1 text-xs text-muted-foreground">{metric.unit}</span>}
        </div>
        <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
          <MetricTrendBadge changePercent={metric.changePercent} lowerIsBetter={metric.lowerIsBetter} trend={metric.trend} />
          <span className="truncate">{metric.latest ? `最新 ${display.label}` : metric.rangeLabel}</span>
        </div>
        <ChartContainer className="aspect-auto! h-9 w-full" config={{ value: { color: 'var(--primary)', label: metric.name } }}>
          <AreaChart data={series} margin={{ bottom: 0, left: 0, right: 0, top: 2 }}>
            <defs>
              <linearGradient id={`health-spark-${metric.id}`} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="var(--color-value)" stopOpacity={0.32} />
                <stop offset="100%" stopColor="var(--color-value)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area animationDuration={500} dataKey="value" dot={false} fill={`url(#health-spark-${metric.id})`} stroke="var(--color-value)" strokeWidth={1.5} />
          </AreaChart>
        </ChartContainer>
      </div>
    </DashboardCard>
  )
}
