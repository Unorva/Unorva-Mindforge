import { useMemo } from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ReferenceLine,
  XAxis,
  YAxis,
} from 'recharts'

import { CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, type ChartConfig } from '@/components/ui/chart'
import { DashboardCard } from '@/components/shared/dashboard-card'
import { cn } from '@/lib/utils'
import { formatHealthValue } from '@/utils/health-format'
import type { HealthMetric } from '@/types/apps/health'

import { categoryIcons, metricIcons } from './metric-icons'
import { MetricTrendBadge } from './metric-tile'

type TooltipItem = {
  color?: string
  dataKey?: string | number
  name?: string | number
  payload?: Record<string, unknown>
  type?: string
  value?: number | string
}

function formatItemValue(metric: HealthMetric, item: TooltipItem) {
  const seriesKey = metric.seriesKeys?.find((key) => key.key === String(item.dataKey))
  const raw = typeof item.value === 'number' ? item.value : Number(item.value ?? 0)
  const value = formatHealthValue(raw, metric.decimals, metric.valueFormat, seriesKey?.timeShift ?? metric.timeShift)
  return metric.unit ? `${value} ${metric.unit}` : value
}

/** 图表提示框：统一处理单位、小数位与时刻格式 */
function MetricTooltip({ active, label, metric, payload }: { active?: boolean; label?: string; metric: HealthMetric; payload?: TooltipItem[] }) {
  if (!active || !payload?.length) return null
  const items = payload.filter((item) => item.type !== 'none' && item.value !== undefined)
  if (!items.length) return null
  return (
    <div className="grid min-w-36 items-start gap-1.5 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl">
      {label && <div className="font-medium">{label}</div>}
      <div className="grid gap-1">
        {items.map((item, index) => {
          const seriesKey = metric.seriesKeys?.find((key) => key.key === String(item.dataKey))
          const name = seriesKey?.name ?? String(item.name ?? metric.name)
          return (
            <div className="flex w-full items-center gap-2" key={`${String(item.dataKey ?? index)}-${index}`}>
              <span className="size-2.5 shrink-0 rounded-[2px]" style={{ backgroundColor: seriesKey?.color ?? item.color ?? 'var(--primary)' }} />
              <span className="text-muted-foreground">{name}</span>
              <span className="ml-auto font-mono font-medium tabular-nums text-foreground">{formatItemValue(metric, item)}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function MetricChartCard({ className, height = 220, metric }: { className?: string; height?: number; metric: HealthMetric }) {
  const Icon = metricIcons[metric.id] ?? categoryIcons[metric.category]
  const seriesKeys = metric.seriesKeys ?? []

  const data = useMemo(
    () => metric.series.map((point) => ({ date: point.date, label: point.label, value: point.value, ...(point.extra ?? {}) })),
    [metric.series],
  )

  const config = useMemo(() => {
    const next: ChartConfig = { value: { color: 'var(--primary)', label: metric.name } }
    for (const key of seriesKeys) next[key.key] = { color: key.color, label: key.name }
    return next
  }, [metric.name, seriesKeys])

  const pieData = useMemo(() => {
    if (metric.chartType !== 'pie') return []
    const point = metric.series[0]
    return seriesKeys.map((key) => ({
      color: key.color,
      fill: key.color,
      key: key.key,
      name: key.name,
      value: point?.extra?.[key.key] ?? 0,
    }))
  }, [metric.chartType, metric.series, seriesKeys])

  const pieTotal = pieData.reduce((total, item) => total + item.value, 0)
  const axisTick = { fill: 'var(--muted-foreground)', fontSize: 11 }
  const showLegend = seriesKeys.length > 1 && metric.chartType !== 'pie'
  const legend = showLegend ? <ChartLegend content={<ChartLegendContent />} verticalAlign="bottom" /> : null
  const aggregateLabel = metric.aggregate === 'sum' ? '合计' : metric.aggregate === 'last' ? '最新' : metric.aggregate === 'max' ? '最高' : metric.aggregate === 'min' ? '最低' : '平均'

  const renderChart = () => {
    if (metric.chartType === 'tile') return null

    if (metric.chartType === 'pie') {
      return (
        <div className="flex flex-col items-center gap-3 sm:flex-row">
          <ChartContainer className="aspect-auto! h-40 w-40 shrink-0" config={config}>
            <PieChart>
              <ChartTooltip content={<MetricTooltip metric={metric} />} />
              <Pie data={pieData} dataKey="value" innerRadius="58%" isAnimationActive nameKey="name" outerRadius="88%" paddingAngle={2} strokeWidth={0}>
                {pieData.map((item) => <Cell fill={item.fill} key={item.key} />)}
              </Pie>
            </PieChart>
          </ChartContainer>
          <ul className="w-full space-y-1.5">
            {pieData.map((item) => (
              <li className="flex items-center gap-2 text-xs" key={item.key}>
                <span className="size-2.5 shrink-0 rounded-[2px]" style={{ backgroundColor: item.color }} />
                <span className="text-muted-foreground">{item.name}</span>
                <span className="ml-auto font-mono tabular-nums text-foreground">{item.value}</span>
                <span className="w-10 text-right text-muted-foreground">{pieTotal ? `${((item.value / pieTotal) * 100).toFixed(0)}%` : '0%'}</span>
              </li>
            ))}
          </ul>
        </div>
      )
    }

    const cartesian = (
      <>
        <CartesianGrid stroke="var(--border)" strokeDasharray="4 4" vertical={false} />
        <XAxis axisLine={false} dataKey="label" minTickGap={18} tick={axisTick} tickLine={false} tickMargin={8} />
        <YAxis
          axisLine={false}
          domain={metric.chartType === 'bar' || metric.chartType === 'stackedBar' ? [0, 'auto'] : ['auto', 'auto']}
          tick={axisTick}
          tickFormatter={(value: number) => formatHealthValue(value, metric.valueFormat === 'time' ? 0 : Math.min(metric.decimals, 1), 'number')}
          tickLine={false}
          width={46}
        />
        <ChartTooltip content={<MetricTooltip metric={metric} />} cursor={{ fill: 'var(--muted)', opacity: 0.35 }} />
        {metric.goal ? <ReferenceLine stroke="var(--border)" strokeDasharray="4 4" y={metric.goal} /> : null}
      </>
    )

    if (metric.chartType === 'bar') {
      return (
        <ChartContainer className="aspect-auto! w-full" config={config} style={{ height }}>
          <BarChart data={data} margin={{ bottom: 0, left: -12, right: 4, top: 8 }}>
            {cartesian}
            <Bar animationDuration={600} dataKey="value" fill="var(--color-value)" maxBarSize={26} radius={[3, 3, 0, 0]} />
          </BarChart>
        </ChartContainer>
      )
    }

    if (metric.chartType === 'stackedBar') {
      return (
        <ChartContainer className="aspect-auto! w-full" config={config} style={{ height }}>
          <BarChart data={data} margin={{ bottom: 0, left: -12, right: 4, top: 8 }}>
            {cartesian}
            {seriesKeys.map((key, index) => (
              <Bar
                animationDuration={600}
                dataKey={key.key}
                fill={key.color}
                key={key.key}
                maxBarSize={26}
                radius={index === seriesKeys.length - 1 ? [3, 3, 0, 0] : undefined}
                stackId="stack"
              />
            ))}
            {legend}
          </BarChart>
        </ChartContainer>
      )
    }

    if (metric.chartType === 'multiLine') {
      return (
        <ChartContainer className="aspect-auto! w-full" config={config} style={{ height }}>
          <LineChart data={data} margin={{ bottom: 0, left: -12, right: 4, top: 8 }}>
            {cartesian}
            {seriesKeys.map((key) => (
              <Line
                activeDot={{ fill: key.color, r: 3, strokeWidth: 0 }}
                animationDuration={600}
                dataKey={key.key}
                dot={false}
                key={key.key}
                stroke={key.color}
                strokeWidth={1.6}
                type="monotone"
              />
            ))}
            {legend}
          </LineChart>
        </ChartContainer>
      )
    }

    if (metric.chartType === 'area') {
      return (
        <ChartContainer className="aspect-auto! w-full" config={config} style={{ height }}>
          <AreaChart data={data} margin={{ bottom: 0, left: -12, right: 4, top: 8 }}>
            <defs>
              <linearGradient id={`health-area-${metric.id}`} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="var(--color-value)" stopOpacity={0.3} />
                <stop offset="100%" stopColor="var(--color-value)" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            {cartesian}
            <Area animationDuration={600} dataKey="value" dot={false} fill={`url(#health-area-${metric.id})`} stroke="var(--color-value)" strokeWidth={1.6} type="monotone" />
          </AreaChart>
        </ChartContainer>
      )
    }

    return (
      <ChartContainer className="aspect-auto! w-full" config={config} style={{ height }}>
        <LineChart data={data} margin={{ bottom: 0, left: -12, right: 4, top: 8 }}>
          {cartesian}
          <Line
            activeDot={{ fill: 'var(--color-value)', r: 3, strokeWidth: 0 }}
            animationDuration={600}
            dataKey="value"
            dot={false}
            stroke="var(--color-value)"
            strokeWidth={1.6}
            type="monotone"
          />
        </LineChart>
      </ChartContainer>
    )
  }

  return (
    <DashboardCard className={cn('flex flex-col gap-0!', className)}>
      <CardHeader className="border-b border-border">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Icon className="shrink-0 text-muted-foreground" size={16} />
              <span className="truncate">{metric.name}</span>
              {metric.unit && <span className="text-xs font-normal text-muted-foreground">/ {metric.unit}</span>}
            </CardTitle>
            <CardDescription className="mt-1 line-clamp-1">
              {metric.rangeLabel} · {aggregateLabel}
              {metric.reference ? ` · 参考 ${metric.reference.label}` : ''}
            </CardDescription>
          </div>
          <div className="text-right">
            <div className="text-lg leading-6 font-semibold tabular-nums">
              {formatHealthValue(metric.current, metric.decimals, metric.valueFormat, metric.timeShift)}
              {metric.unit && <span className="ml-1 text-xs font-normal text-muted-foreground">{metric.unit}</span>}
            </div>
            <MetricTrendBadge changePercent={metric.changePercent} className="mt-1" lowerIsBetter={metric.lowerIsBetter} trend={metric.trend} />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 p-4">
        {metric.chartType === 'tile' ? (
          <p className="py-8 text-center text-sm text-muted-foreground">{metric.description ?? '该指标为固定档案数据。'}</p>
        ) : (
          <>
            {renderChart()}
            {metric.goal ? <p className="text-xs text-muted-foreground">目标：{formatHealthValue(metric.goal, metric.decimals)} {metric.unit}（图中虚线）</p> : null}
          </>
        )}
      </CardContent>
    </DashboardCard>
  )
}
