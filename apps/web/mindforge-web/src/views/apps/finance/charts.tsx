import { useState } from 'react'
import { Bar, BarChart, CartesianGrid, Pie, PieChart, XAxis, YAxis } from 'recharts'
import { ChartPie, TrendingUp } from 'lucide-react'

import type { CategorySlice, MonthlyPoint } from '@/api/finance/finance'
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, type ChartConfig } from '@/components/ui/chart'
import { CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DashboardCard } from '@/components/shared/dashboard-card'
import { formatCompactMoney, formatMoney, formatMonthTick } from './format'

type TooltipItem = {
  name?: string
  value?: number
  color?: string
  dataKey?: string
  type?: string
  payload?: { fill?: string }
}

function MoneyTooltipContent({ active, payload, label, config }: {
  active?: boolean
  payload?: TooltipItem[]
  label?: string
  config?: Record<string, { label?: string }>
}) {
  if (!active || !payload?.length) return null
  const items = payload.filter((item) => item.type !== 'none' && item.value !== undefined)
  if (!items.length) return null
  return (
    <div className="grid min-w-36 items-start gap-1.5 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl">
      {label && <div className="font-medium">{label}</div>}
      <div className="grid gap-1.5">
        {items.map((item, index) => (
          <div className="flex w-full items-center gap-2" key={index}>
            <div className="h-2.5 w-2.5 shrink-0 rounded-[2px]" style={{ backgroundColor: item.color ?? item.payload?.fill }} />
            <span className="text-muted-foreground">{config?.[item.dataKey ?? '']?.label ?? item.name}</span>
            <span className="ml-auto font-mono font-medium tabular-nums text-foreground">{formatMoney(item.value as number)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

const trendChartConfig = {
  income: { label: '收入', color: 'var(--chart-2)' },
  expense: { label: '支出', color: 'var(--chart-1)' },
} satisfies ChartConfig

const rangeOptions = ['近6个月', '近12个月']

export function IncomeExpenseTrend({ trend }: { trend: MonthlyPoint[] }) {
  const [range, setRange] = useState(rangeOptions[0])
  const data = range === '近6个月' ? trend.slice(-6) : trend

  return (
    <DashboardCard className="flex flex-col gap-0!">
      <CardHeader className="border-b border-border">
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="text-muted-foreground" size={16} />
          收支趋势
        </CardTitle>
        <CardAction>
          <Select onValueChange={(value) => value && setRange(value)} value={range}>
            <SelectTrigger aria-label="时间范围" className="h-auto! w-fit cursor-pointer gap-1.5 border-border px-3 text-sm font-medium text-foreground shadow-[0px_1px_2px_rgba(0,0,0,0.05)]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {rangeOptions.map((option) => <SelectItem className="cursor-pointer" key={option} value={option}>{option}</SelectItem>)}
            </SelectContent>
          </Select>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-4 p-5">
        <ChartContainer className="min-h-[280px] w-full flex-1" config={trendChartConfig}>
          <BarChart barGap={5} data={data} margin={{ top: 8, right: 4, bottom: 0, left: -12 }}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="4 4" vertical={false} />
            <XAxis axisLine={false} dataKey="month" tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }} tickFormatter={formatMonthTick} tickLine={false} tickMargin={10} />
            <YAxis axisLine={false} tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }} tickFormatter={formatCompactMoney} tickLine={false} tickMargin={4} width={56} />
            <ChartTooltip content={<MoneyTooltipContent config={trendChartConfig} />} cursor={{ fill: 'var(--muted)', opacity: 0.5 }} />
            <ChartLegend content={<ChartLegendContent />} />
            <Bar animationDuration={600} dataKey="income" fill="var(--color-income)" isAnimationActive maxBarSize={24} radius={[4, 4, 0, 0]} />
            <Bar animationBegin={100} animationDuration={600} dataKey="expense" fill="var(--color-expense)" isAnimationActive maxBarSize={24} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </DashboardCard>
  )
}

const donutPalette = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-4)',
  'var(--chart-3)',
  'var(--chart-5)',
  'color-mix(in srgb, var(--chart-1) 65%, transparent)',
  'color-mix(in srgb, var(--chart-2) 65%, transparent)',
  'color-mix(in srgb, var(--chart-4) 65%, transparent)',
  'color-mix(in srgb, var(--chart-3) 65%, transparent)',
]

export function CategoryBreakdown({ slices }: { slices: CategorySlice[] }) {
  const total = slices.reduce((sum, slice) => sum + slice.amount, 0)
  const data = slices.map((slice, index) => ({ ...slice, fill: donutPalette[index % donutPalette.length] }))
  const chartConfig = Object.fromEntries(
    slices.map((slice, index) => [`cat${index}`, { label: slice.category, color: donutPalette[index % donutPalette.length] }]),
  ) as ChartConfig

  return (
    <DashboardCard className="flex flex-col gap-0!">
      <CardHeader className="border-b border-border">
        <CardTitle className="flex items-center gap-2">
          <ChartPie className="text-muted-foreground" size={16} />
          本月支出分类
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col items-center justify-center p-5">
        {slices.length ? (
          <div className="relative w-full max-w-[260px]">
            <ChartContainer className="aspect-square w-full" config={chartConfig}>
              <PieChart>
                <ChartTooltip content={<MoneyTooltipContent />} />
                <Pie animationDuration={600} data={data} dataKey="amount" innerRadius="62%" isAnimationActive nameKey="category" outerRadius="92%" paddingAngle={2} strokeWidth={0} />
              </PieChart>
            </ChartContainer>
            <div className="pointer-events-none absolute inset-0 grid place-items-center">
              <div className="text-center">
                <p className="text-xs text-muted-foreground">本月支出</p>
                <p className="text-lg font-semibold tabular-nums">{formatMoney(total, 0)}</p>
              </div>
            </div>
          </div>
        ) : <p className="py-10 text-center text-sm text-muted-foreground">本月还没有支出记录。</p>}
      </CardContent>
    </DashboardCard>
  )
}
