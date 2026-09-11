import { PolarAngleAxis, RadialBar, RadialBarChart } from 'recharts'
import { Database, HeartPulse, Smartphone, Watch } from 'lucide-react'

import { CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer } from '@/components/ui/chart'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { DashboardCard } from '@/components/shared/dashboard-card'
import { cn } from '@/lib/utils'
import { formatDateTime, formatHealthValue } from '@/utils/health-format'
import type { ActivityRing, DataSource, GoalProgress, HealthProfile, ScoreBreakdown } from '@/types/apps/health'

function scoreColor(score: number) {
  if (score >= 80) return '#10b981'
  if (score >= 65) return '#84cc16'
  if (score >= 50) return '#f59e0b'
  return '#ef4444'
}

function scoreLabel(score: number) {
  if (score >= 85) return '优秀'
  if (score >= 75) return '良好'
  if (score >= 60) return '一般'
  return '需改善'
}

export function HealthScoreCard({ breakdown, className, score, trend }: { breakdown: ScoreBreakdown[]; className?: string; score: number; trend: number }) {
  const color = scoreColor(score)
  return (
    <DashboardCard className={cn('flex flex-col gap-0!', className)}>
      <CardHeader className="border-b border-border">
        <CardTitle className="flex items-center gap-2 text-sm"><HeartPulse className="text-muted-foreground" size={16} />综合健康评分</CardTitle>
        <CardDescription className="mt-1">基于近 30 天各项指标加权计算</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 p-4">
        <div className="relative mx-auto h-36 w-36">
          <ChartContainer className="aspect-auto! h-full w-full" config={{ score: { color, label: '健康评分' } }}>
            <RadialBarChart data={[{ fill: 'var(--color-score)', name: '健康评分', value: score }]} endAngle={-270} innerRadius="78%" outerRadius="100%" startAngle={90}>
              <PolarAngleAxis angleAxisId={0} dataKey="value" domain={[0, 100]} tick={false} type="number" />
              <RadialBar angleAxisId={0} background cornerRadius={12} dataKey="value" isAnimationActive animationDuration={800} />
            </RadialBarChart>
          </ChartContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-semibold tracking-tight tabular-nums">{score}</span>
            <span className="text-xs text-muted-foreground">{scoreLabel(score)}</span>
            <span className={cn('mt-0.5 text-xs font-medium', trend >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400')}>
              {trend >= 0 ? '+' : ''}{trend.toFixed(1)} 较上月
            </span>
          </div>
        </div>
        <Separator />
        <ul className="space-y-3">
          {breakdown.map((item) => (
            <li key={item.id}>
              <div className="flex items-baseline justify-between gap-2 text-xs">
                <span className="font-medium">{item.name}</span>
                <span className="font-mono tabular-nums" style={{ color: scoreColor(item.score) }}>{item.score}</span>
              </div>
              <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{item.detail}</p>
              <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full transition-all duration-700" style={{ backgroundColor: scoreColor(item.score), width: `${item.score}%` }} />
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </DashboardCard>
  )
}

export function ActivityRingsCard({ className, rings }: { className?: string; rings: ActivityRing[] }) {
  const data = rings.map((ring) => ({
    fill: ring.color,
    name: ring.name,
    value: Math.min(ring.current / (ring.goal || 1), 1),
  }))
  return (
    <DashboardCard className={cn('flex flex-col gap-0!', className)}>
      <CardHeader className="border-b border-border">
        <CardTitle className="text-sm">今日活动圆环</CardTitle>
        <CardDescription className="mt-1">来自 Apple Watch 的活动记录</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 p-4">
        <ChartContainer
          className="aspect-auto! mx-auto h-40 w-40"
          config={Object.fromEntries(rings.map((ring) => [ring.id, { color: ring.color, label: ring.name }]))}
        >
          <RadialBarChart data={data} endAngle={-270} innerRadius="38%" outerRadius="100%" startAngle={90}>
            <PolarAngleAxis angleAxisId={0} dataKey="value" domain={[0, 1]} tick={false} type="number" />
            <RadialBar angleAxisId={0} background cornerRadius={12} dataKey="value" isAnimationActive animationDuration={800} />
          </RadialBarChart>
        </ChartContainer>
        <ul className="space-y-2.5">
          {rings.map((ring) => {
            const percent = Math.round((ring.current / (ring.goal || 1)) * 100)
            return (
              <li className="flex items-center gap-2 text-xs" key={ring.id}>
                <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: ring.color }} />
                <span className="text-muted-foreground">{ring.name}</span>
                <span className="ml-auto font-mono tabular-nums text-foreground">
                  {formatHealthValue(ring.current, ring.id === 'stand' ? 0 : 0)}
                  <span className="text-muted-foreground"> / {ring.goal} {ring.unit}</span>
                </span>
                <span className={cn('w-10 text-right font-mono tabular-nums', percent >= 100 ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground')}>{percent}%</span>
              </li>
            )
          })}
        </ul>
      </CardContent>
    </DashboardCard>
  )
}

export function GoalProgressCard({ className, goals, rangeLabel }: { className?: string; goals: GoalProgress[]; rangeLabel: string }) {
  return (
    <DashboardCard className={cn('flex flex-col gap-0!', className)}>
      <CardHeader className="border-b border-border">
        <CardTitle className="text-sm">目标完成度</CardTitle>
        <CardDescription className="mt-1">{rangeLabel} · 日均值与目标对比</CardDescription>
      </CardHeader>
      <CardContent className="p-4">
        <ul className="space-y-3.5">
          {goals.map((goal) => {
            const percent = Math.min(Math.round((goal.current / (goal.target || 1)) * 100), 100)
            const reached = goal.current >= goal.target
            return (
              <li key={goal.id}>
                <div className="flex items-baseline justify-between gap-2 text-xs">
                  <span className="truncate font-medium">{goal.name}</span>
                  <span className="shrink-0 font-mono tabular-nums text-muted-foreground">
                    <span className="text-foreground">{formatHealthValue(goal.current, goal.decimals)}</span> / {formatHealthValue(goal.target, goal.decimals)} {goal.unit}
                  </span>
                </div>
                <Progress className="mt-2 gap-0" value={percent} />
                <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>完成 {percent}%</span>
                  {reached ? <Badge className="bg-emerald-500/12 px-1.5 py-0 text-[11px] text-emerald-700 dark:text-emerald-400">已达标</Badge> : <span>还差 {formatHealthValue(goal.target - goal.current, goal.decimals)} {goal.unit}</span>}
                </div>
              </li>
            )
          })}
        </ul>
      </CardContent>
    </DashboardCard>
  )
}

export function ProfileCard({ className, profile, recordCount, spanLabel, lastSyncAt, categoryCount }: { categoryCount: number; className?: string; lastSyncAt: string; profile: HealthProfile; recordCount: number; spanLabel: string }) {
  const items = [
    { label: '年龄', value: `${profile.age} 岁` },
    { label: '性别', value: profile.sex },
    { label: '身高', value: `${profile.height} 厘米` },
    { label: '体重', value: `${profile.weight.toFixed(1)} 公斤` },
    { label: '血型', value: profile.bloodType },
    { label: '数据分类', value: `${categoryCount} 类` },
  ]
  return (
    <DashboardCard className={cn('flex flex-col gap-0!', className)}>
      <CardHeader className="border-b border-border">
        <CardTitle className="text-sm">健康档案</CardTitle>
        <CardDescription className="mt-1">{profile.name} · Apple Health 数据区间 {spanLabel}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 p-4">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
          {items.map((item) => (
            <div key={item.label}>
              <dt className="text-[11px] text-muted-foreground">{item.label}</dt>
              <dd className="mt-0.5 text-sm font-medium tabular-nums">{item.value}</dd>
            </div>
          ))}
        </dl>
        <Separator />
        <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5"><Database size={14} />累计 {recordCount.toLocaleString('zh-CN')} 条记录</span>
          <span>同步于 {formatDateTime(lastSyncAt)}</span>
        </div>
      </CardContent>
    </DashboardCard>
  )
}

export function DataSourceCard({ className, sources }: { className?: string; sources: DataSource[] }) {
  const iconByKind = { device: Watch, app: Smartphone, manual: Database }
  return (
    <DashboardCard className={cn('flex flex-col gap-0!', className)}>
      <CardHeader className="border-b border-border">
        <CardTitle className="text-sm">数据来源</CardTitle>
        <CardDescription className="mt-1">写入 Apple Health 的设备与应用</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <ul>
          {sources.map((source) => {
            const Icon = iconByKind[source.kind]
            return (
              <li className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-b-0" key={source.id}>
                <span className="grid size-8 shrink-0 place-items-center rounded-md bg-muted text-muted-foreground"><Icon size={15} /></span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{source.name}</p>
                  <p className="truncate text-[11px] text-muted-foreground">{source.vendor} · {source.categories.join('、')}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-mono text-xs tabular-nums text-foreground">{source.records.toLocaleString('zh-CN')}</p>
                  <Badge className={cn('mt-1 px-1.5 py-0 text-[11px]', source.status === '已连接' ? 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-400' : 'bg-amber-500/12 text-amber-700 dark:text-amber-400')}>{source.status}</Badge>
                </div>
              </li>
            )
          })}
        </ul>
      </CardContent>
    </DashboardCard>
  )
}
