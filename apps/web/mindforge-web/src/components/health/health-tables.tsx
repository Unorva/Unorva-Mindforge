import { useMemo, useState } from 'react'
import { FlaskConical, NotebookText, Search } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { DashboardCard } from '@/components/shared/dashboard-card'
import { cn } from '@/lib/utils'
import { formatDate, formatDateTime, formatDuration } from '@/utils/health-format'
import type { HealthRecord, MetricStatus, PeriodComparison, Workout } from '@/types/apps/health'

import { MetricTrendBadge } from './metric-tile'

const statusClass: Record<MetricStatus, string> = {
  good: 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-400',
  watch: 'bg-amber-500/12 text-amber-700 dark:text-amber-400',
  alert: 'bg-red-500/12 text-red-700 dark:text-red-400',
}

const statusLabel: Record<MetricStatus, string> = { good: '正常', watch: '需关注', alert: '异常' }

function EmptyRow({ colSpan, text }: { colSpan: number; text: string }) {
  return <TableRow><TableCell className="h-24 text-center text-sm text-muted-foreground" colSpan={colSpan}>{text}</TableCell></TableRow>
}

export function WorkoutTable({ className, rangeLabel, workouts }: { className?: string; rangeLabel: string; workouts: Workout[] }) {
  const [type, setType] = useState('all')
  const [keyword, setKeyword] = useState('')

  const types = useMemo(() => [...new Set(workouts.map((workout) => workout.type))], [workouts])
  const rows = useMemo(() => workouts.filter((workout) => {
    if (type !== 'all' && workout.type !== type) return false
    if (keyword.trim() && !`${workout.type}${workout.source}${formatDateTime(workout.startedAt)}`.includes(keyword.trim())) return false
    return true
  }).slice(0, 60), [keyword, type, workouts])

  const totals = useMemo(() => ({
    count: rows.length,
    duration: rows.reduce((total, item) => total + item.durationMinutes, 0),
    energy: rows.reduce((total, item) => total + item.activeEnergy, 0),
  }), [rows])

  return (
    <DashboardCard className={cn('flex flex-col gap-0!', className)}>
      <CardHeader className="border-b border-border">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="text-sm">体能训练记录</CardTitle>
            <CardDescription className="mt-1">{rangeLabel} · 共 {totals.count} 次训练 / {formatDuration(totals.duration)} / {totals.energy.toLocaleString('zh-CN')} 千卡</CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input className="h-8 w-40 pl-7 text-xs" onChange={(event) => setKeyword(event.target.value)} placeholder="搜索训练…" value={keyword} />
            </div>
            <Select onValueChange={(value) => value && setType(value)} value={type}>
              <SelectTrigger aria-label="按训练类型筛选" className="h-8 w-32 cursor-pointer text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem className="cursor-pointer" value="all">全部类型</SelectItem>
                {types.map((item) => <SelectItem className="cursor-pointer" key={item} value={item}>{item}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent className="max-h-105 overflow-auto p-0">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="pl-4">训练类型</TableHead>
              <TableHead>开始时间</TableHead>
              <TableHead className="text-right">时长</TableHead>
              <TableHead className="text-right">距离</TableHead>
              <TableHead className="text-right">活动能量</TableHead>
              <TableHead className="text-right">平均心率</TableHead>
              <TableHead className="text-right">最高心率</TableHead>
              <TableHead className="pr-4 text-right">来源</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length ? rows.map((workout) => (
              <TableRow key={workout.id}>
                <TableCell className="pl-4 font-medium">{workout.type}</TableCell>
                <TableCell className="text-muted-foreground tabular-nums">{formatDateTime(workout.startedAt)}</TableCell>
                <TableCell className="text-right tabular-nums">{workout.durationMinutes} 分钟</TableCell>
                <TableCell className="text-right tabular-nums">{workout.distanceKm ? `${workout.distanceKm.toFixed(2)} 公里` : '—'}</TableCell>
                <TableCell className="text-right tabular-nums">{workout.activeEnergy} 千卡</TableCell>
                <TableCell className="text-right tabular-nums">{workout.averageHeartRate}</TableCell>
                <TableCell className="text-right tabular-nums">{workout.maxHeartRate}</TableCell>
                <TableCell className="pr-4 text-right text-xs text-muted-foreground">{workout.source}</TableCell>
              </TableRow>
            )) : <EmptyRow colSpan={8} text="没有符合条件的训练记录。" />}
          </TableBody>
        </Table>
      </CardContent>
    </DashboardCard>
  )
}

export function LabTable({ className, records }: { className?: string; records: HealthRecord[] }) {
  const labs = records.filter((record) => record.category === 'lab')
  return (
    <DashboardCard className={cn('flex flex-col gap-0!', className)}>
      <CardHeader className="border-b border-border">
        <CardTitle className="flex items-center gap-2 text-sm"><FlaskConical className="text-muted-foreground" size={16} />实验室化验结果</CardTitle>
        <CardDescription className="mt-1">由医院检验科与家用检测设备写入健康 App</CardDescription>
      </CardHeader>
      <CardContent className="max-h-105 overflow-auto p-0">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="pl-4">项目</TableHead>
              <TableHead>检测日期</TableHead>
              <TableHead className="text-right">结果</TableHead>
              <TableHead>参考范围</TableHead>
              <TableHead className="pr-4">状态</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {labs.length ? labs.map((record) => (
              <TableRow key={record.id}>
                <TableCell className="pl-4 font-medium">{record.name}</TableCell>
                <TableCell className="text-muted-foreground">{formatDate(record.date)}</TableCell>
                <TableCell className="text-right font-mono tabular-nums">{record.value} {record.unit}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{record.reference ?? '—'}</TableCell>
                <TableCell className="pr-4">
                  <Badge className={cn('px-1.5 py-0 text-[11px] hover:bg-transparent', statusClass[record.status])}>{statusLabel[record.status]}</Badge>
                  {record.detail && <p className="mt-1 max-w-60 text-[11px] leading-4 text-muted-foreground">{record.detail}</p>}
                </TableCell>
              </TableRow>
            )) : <EmptyRow colSpan={5} text="暂无化验记录。" />}
          </TableBody>
        </Table>
      </CardContent>
    </DashboardCard>
  )
}

export function SymptomTable({ className, records }: { className?: string; records: HealthRecord[] }) {
  const symptoms = records.filter((record) => record.category === 'symptom')
  return (
    <DashboardCard className={cn('flex flex-col gap-0!', className)}>
      <CardHeader className="border-b border-border">
        <CardTitle className="flex items-center gap-2 text-sm"><NotebookText className="text-muted-foreground" size={16} />症状记录</CardTitle>
        <CardDescription className="mt-1">手动记录与设备识别的症状，用于关联体征波动</CardDescription>
      </CardHeader>
      <CardContent className="max-h-105 overflow-auto p-0">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="pl-4">症状</TableHead>
              <TableHead>日期</TableHead>
              <TableHead>程度</TableHead>
              <TableHead>说明</TableHead>
              <TableHead className="pr-4 text-right">来源</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {symptoms.length ? symptoms.map((record) => (
              <TableRow key={record.id}>
                <TableCell className="pl-4 font-medium">{record.name}</TableCell>
                <TableCell className="text-muted-foreground">{formatDate(record.date)}</TableCell>
                <TableCell>
                  <Badge className={cn('px-1.5 py-0 text-[11px] hover:bg-transparent', record.severity === '中度' ? statusClass.watch : 'bg-muted text-muted-foreground hover:bg-muted')}>{record.severity}</Badge>
                </TableCell>
                <TableCell className="max-w-80 text-xs text-muted-foreground">{record.detail}</TableCell>
                <TableCell className="pr-4 text-right text-xs text-muted-foreground">{record.source}</TableCell>
              </TableRow>
            )) : <EmptyRow colSpan={5} text="暂无症状记录。" />}
          </TableBody>
        </Table>
      </CardContent>
    </DashboardCard>
  )
}

export function ComparisonTable({ className, comparisons, rangeLabel }: { className?: string; comparisons: PeriodComparison[]; rangeLabel: string }) {
  return (
    <DashboardCard className={cn('flex flex-col gap-0!', className)}>
      <CardHeader className="border-b border-border">
        <CardTitle className="text-sm">周期对比</CardTitle>
        <CardDescription className="mt-1">{rangeLabel}与上一周期的关键指标变化</CardDescription>
      </CardHeader>
      <CardContent className="max-h-105 overflow-auto p-0">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="pl-4">指标</TableHead>
              <TableHead className="text-right">本期</TableHead>
              <TableHead className="text-right">上期</TableHead>
              <TableHead className="pr-4 text-right">变化</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {comparisons.length ? comparisons.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="pl-4 font-medium">{item.name}{item.unit && <span className="ml-1 text-xs font-normal text-muted-foreground">{item.unit}</span>}</TableCell>
                <TableCell className="text-right font-mono tabular-nums">{item.current.toLocaleString('zh-CN', { maximumFractionDigits: item.decimals, minimumFractionDigits: item.decimals })}</TableCell>
                <TableCell className="text-right font-mono tabular-nums text-muted-foreground">{item.previous.toLocaleString('zh-CN', { maximumFractionDigits: item.decimals, minimumFractionDigits: item.decimals })}</TableCell>
                <TableCell className="pr-4 text-right"><MetricTrendBadge changePercent={item.changePercent} className="justify-end" lowerIsBetter={item.lowerIsBetter} trend={item.trend} /></TableCell>
              </TableRow>
            )) : <EmptyRow colSpan={4} text="暂无可对比的数据。" />}
          </TableBody>
        </Table>
      </CardContent>
    </DashboardCard>
  )
}
