import { CartesianGrid, PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, Scatter, ScatterChart, XAxis, YAxis } from 'recharts'
import { CalendarDays, Info, Lightbulb, Sparkles, Stethoscope, TriangleAlert, TrendingUp } from 'lucide-react'

import { CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer, ChartTooltip } from '@/components/ui/chart'
import { Badge } from '@/components/ui/badge'
import { DashboardCard } from '@/components/shared/dashboard-card'
import { cn } from '@/lib/utils'
import { formatDate } from '@/utils/health-format'
import type { Anomaly, Correlation, HealthEventRecord, Insight, ScoreBreakdown } from '@/types/apps/health'

const toneStyles: Record<Insight['tone'], { badge: string; icon: typeof Info }> = {
  positive: { badge: 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-400', icon: TrendingUp },
  neutral: { badge: 'bg-blue-500/12 text-blue-700 dark:text-blue-400', icon: Info },
  warning: { badge: 'bg-amber-500/12 text-amber-700 dark:text-amber-400', icon: TriangleAlert },
}

const severityStyles: Record<Anomaly['severity'], { badge: string; label: string }> = {
  critical: { badge: 'bg-red-500/12 text-red-700 dark:text-red-400', label: '危急' },
  warning: { badge: 'bg-amber-500/12 text-amber-700 dark:text-amber-400', label: '警告' },
  info: { badge: 'bg-blue-500/12 text-blue-700 dark:text-blue-400', label: '提示' },
}

export function ScoreRadarCard({ breakdown, className }: { breakdown: ScoreBreakdown[]; className?: string }) {
  return (
    <DashboardCard className={cn('flex flex-col gap-0!', className)}>
      <CardHeader className="border-b border-border">
        <CardTitle className="flex items-center gap-2 text-sm"><Stethoscope className="text-muted-foreground" size={16} />健康维度画像</CardTitle>
        <CardDescription className="mt-1">六个维度的得分越靠外越好</CardDescription>
      </CardHeader>
      <CardContent className="p-4">
        <ChartContainer className="aspect-auto! h-64 w-full" config={{ score: { color: 'var(--primary)', label: '得分' } }}>
          <RadarChart data={breakdown} margin={{ bottom: 4, left: 4, right: 4, top: 4 }} outerRadius="72%">
            <PolarGrid stroke="var(--border)" />
            <PolarAngleAxis dataKey="name" tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }} />
            <PolarRadiusAxis axisLine={false} domain={[0, 100]} tick={false} />
            <ChartTooltip content={<ChartTooltip hideLabel indicator="dot" />} />
            <Radar animationDuration={700} dataKey="score" fill="var(--color-score)" fillOpacity={0.22} stroke="var(--color-score)" strokeWidth={1.6} />
          </RadarChart>
        </ChartContainer>
      </CardContent>
    </DashboardCard>
  )
}

export function InsightList({ className, insights, title = 'AI 健康洞察' }: { className?: string; insights: Insight[]; title?: string }) {
  return (
    <DashboardCard className={cn('flex flex-col gap-0!', className)}>
      <CardHeader className="border-b border-border">
        <CardTitle className="flex items-center gap-2 text-sm"><Sparkles className="text-muted-foreground" size={16} />{title}</CardTitle>
        <CardDescription className="mt-1">基于区间内指标变化自动生成，共 {insights.length} 条</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {insights.length ? (
          <ul>
            {insights.map((insight) => {
              const style = toneStyles[insight.tone]
              const Icon = style.icon
              return (
                <li className="flex gap-3 border-b border-border px-4 py-3 last:border-b-0" key={insight.id}>
                  <span className={cn('mt-0.5 grid size-7 shrink-0 place-items-center rounded-md', style.badge)}><Icon size={14} /></span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium">{insight.title}</p>
                      <Badge className="bg-muted px-1.5 py-0 text-[11px] font-normal text-muted-foreground hover:bg-muted">{insight.tag}</Badge>
                    </div>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">{insight.detail}</p>
                  </div>
                </li>
              )
            })}
          </ul>
        ) : <p className="px-4 py-10 text-center text-sm text-muted-foreground">区间内没有显著变化。</p>}
      </CardContent>
    </DashboardCard>
  )
}

export function AnomalyList({ anomalies, className }: { anomalies: Anomaly[]; className?: string }) {
  return (
    <DashboardCard className={cn('flex flex-col gap-0!', className)}>
      <CardHeader className="border-b border-border">
        <CardTitle className="flex items-center gap-2 text-sm"><TriangleAlert className="text-muted-foreground" size={16} />异常与提醒</CardTitle>
        <CardDescription className="mt-1">近 90 天内超出参考阈值的记录</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {anomalies.length ? (
          <ul>
            {anomalies.map((anomaly) => {
              const style = severityStyles[anomaly.severity]
              return (
                <li className="border-b border-border px-4 py-3 last:border-b-0" key={anomaly.id}>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className={cn('px-1.5 py-0 text-[11px] hover:bg-transparent', style.badge)}>{style.label}</Badge>
                    <p className="text-sm font-medium">{anomaly.title}</p>
                    <span className="ml-auto text-[11px] text-muted-foreground">{formatDate(anomaly.date)}</span>
                  </div>
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    {anomaly.metricName} <span className="font-mono text-foreground">{anomaly.value}</span>（阈值 {anomaly.threshold}）
                  </p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">{anomaly.detail}</p>
                </li>
              )
            })}
          </ul>
        ) : <p className="px-4 py-10 text-center text-sm text-muted-foreground">近 90 天没有异常记录。</p>}
      </CardContent>
    </DashboardCard>
  )
}

function CorrelationTooltip({ active, correlation, payload }: { active?: boolean; correlation: Correlation; payload?: { payload?: { x?: number; y?: number } }[] }) {
  if (!active || !payload?.length) return null
  const point = payload[0]?.payload
  if (!point) return null
  return (
    <div className="grid min-w-36 gap-1 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl">
      <div className="flex items-center justify-between gap-3">
        <span className="text-muted-foreground">{correlation.xName}</span>
        <span className="font-mono tabular-nums">{point.x} {correlation.xUnit}</span>
      </div>
      <div className="flex items-center justify-between gap-3">
        <span className="text-muted-foreground">{correlation.yName}</span>
        <span className="font-mono tabular-nums">{point.y} {correlation.yUnit}</span>
      </div>
    </div>
  )
}

export function CorrelationCard({ className, correlation }: { className?: string; correlation: Correlation }) {
  const direction = correlation.coefficient > 0 ? '正' : '负'
  return (
    <DashboardCard className={cn('flex flex-col gap-0!', className)}>
      <CardHeader className="border-b border-border">
        <CardTitle className="text-sm">{correlation.title}</CardTitle>
        <CardDescription className="mt-1">近 90 天共 {correlation.points.length} 组样本</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 p-4">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <Badge className="bg-primary/10 px-1.5 py-0 text-primary hover:bg-primary/10">r = {correlation.coefficient.toFixed(2)}</Badge>
          <span className="text-muted-foreground">{correlation.strength} · {direction}相关</span>
        </div>
        <ChartContainer className="aspect-auto! h-44 w-full" config={{ point: { color: 'var(--primary)', label: correlation.title } }}>
          <ScatterChart data={correlation.points} margin={{ bottom: 0, left: -14, right: 6, top: 6 }}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="4 4" />
            <XAxis dataKey="x" name={correlation.xName} tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }} tickLine={false} type="number" />
            <YAxis dataKey="y" name={correlation.yName} tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }} tickLine={false} type="number" width={44} />
            <ChartTooltip content={<CorrelationTooltip correlation={correlation} />} cursor={{ stroke: 'var(--border)', strokeDasharray: '3 3' }} />
            <Scatter animationDuration={600} data={correlation.points} fill="var(--color-point)" fillOpacity={0.55} />
          </ScatterChart>
        </ChartContainer>
        <p className="text-xs leading-5 text-muted-foreground">{correlation.description}</p>
      </CardContent>
    </DashboardCard>
  )
}

export function HealthReportCard({ className, recommendations, summary }: { className?: string; recommendations: string[]; summary: string }) {
  return (
    <DashboardCard className={cn('flex flex-col gap-0!', className)}>
      <CardHeader className="border-b border-border">
        <CardTitle className="flex items-center gap-2 text-sm"><Lightbulb className="text-muted-foreground" size={16} />本期健康报告与建议</CardTitle>
        <CardDescription className="mt-1">由模拟分析引擎根据区间数据生成</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 p-4">
        <p className="rounded-lg border border-border bg-muted/40 p-3 text-sm leading-6">{summary}</p>
        <ol className="space-y-2.5">
          {recommendations.map((item, index) => (
            <li className="flex gap-2.5 text-sm leading-6" key={item}>
              <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-primary text-[11px] font-medium text-primary-foreground">{index + 1}</span>
              <span className="text-muted-foreground">{item}</span>
            </li>
          ))}
        </ol>
      </CardContent>
    </DashboardCard>
  )
}

export function EventTimeline({ className, events }: { className?: string; events: HealthEventRecord[] }) {
  return (
    <DashboardCard className={cn('flex flex-col gap-0!', className)}>
      <CardHeader className="border-b border-border">
        <CardTitle className="flex items-center gap-2 text-sm"><CalendarDays className="text-muted-foreground" size={16} />生活事件时间线</CardTitle>
        <CardDescription className="mt-1">近 90 天中影响健康数据的事件</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <ul>
          {events.map((event) => (
            <li className="flex gap-3 border-b border-border px-4 py-3 last:border-b-0" key={event.id}>
              <div className="w-16 shrink-0 text-xs text-muted-foreground tabular-nums">{formatDate(event.date).replace('月', '/').replace('日', '')}</div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{event.title}<span className="ml-2 text-[11px] font-normal text-muted-foreground">持续 {event.days} 天</span></p>
                <p className="mt-0.5 text-xs leading-5 text-muted-foreground">{event.detail}</p>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </DashboardCard>
  )
}
