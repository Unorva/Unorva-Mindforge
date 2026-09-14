import { useState } from 'react'
import { ChartColumnStacked, MousePointerClick } from 'lucide-react'

import {
  SegmentedMultipleBarChart,
  type SegmentedBarChartDatum,
  type SegmentedBarChartSeries,
} from '@/components/charts/segmented-multiple-bar-chart'
import { AppPage, AppPageHeader } from '@/components/shared/app-workspace'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const series: SegmentedBarChartSeries[] = [
  { key: 'group1', label: 'Group 1', color: 'color-mix(in oklab, var(--foreground) 96%, var(--background))' },
  { key: 'group2', label: 'Group 2', color: 'color-mix(in oklab, var(--foreground) 78%, var(--background))' },
  { key: 'group3', label: 'Group 3', color: 'color-mix(in oklab, var(--foreground) 60%, var(--background))' },
  { key: 'group4', label: 'Group 4', color: 'color-mix(in oklab, var(--foreground) 42%, var(--background))' },
  { key: 'group5', label: 'Group 5', color: 'color-mix(in oklab, var(--foreground) 24%, var(--background))' },
]

const monthlyData: SegmentedBarChartDatum[] = [
  { category: 'Jan', group1: 2600, group2: 2450, group3: 1450, group4: 950, group5: 650 },
  { category: 'Feb', group1: 3400, group2: 2900, group3: 2050, group4: 1350, group5: 1200 },
  { category: 'Mar', group1: 3050, group2: 2500, group3: 2200, group4: 1350, group5: 1050 },
  { category: 'Apr', group1: 2100, group2: 1600, group3: 1250, group4: 1050, group5: 900 },
  { category: 'May', group1: 2450, group2: 2050, group3: 1450, group4: 1000, group5: 850 },
  { category: 'Jun', group1: 2600, group2: 2300, group3: 1900, group4: 1550, group5: 1200 },
  { category: 'Jul', group1: 2900, group2: 2450, group3: 2050, group4: 1600, group5: 1200 },
]

const weeklyData: SegmentedBarChartDatum[] = [
  { category: 'Mon', group1: 2100, group2: 1700, group3: 1150, group4: 800, group5: 500 },
  { category: 'Tue', group1: 2750, group2: 2300, group3: 1800, group4: 1300, group5: 900 },
  { category: 'Wed', group1: 2400, group2: 2150, group3: 1500, group4: 1050, group5: 700 },
  { category: 'Thu', group1: 3100, group2: 2700, group3: 2200, group4: 1600, group5: 1150 },
  { category: 'Fri', group1: 3450, group2: 3000, group3: 2500, group4: 1850, group5: 1400 },
  { category: 'Sat', group1: 1800, group2: 1450, group3: 1000, group4: 700, group5: 400 },
  { category: 'Sun', group1: 1450, group2: 1200, group3: 850, group4: 550, group5: 300 },
]

const datasets = {
  monthly: { data: monthlyData, label: '月度数据' },
  weekly: { data: weeklyData, label: '周度数据' },
}

type DatasetKey = keyof typeof datasets

export default function SegmentedBarChartTestPage() {
  const [datasetKey, setDatasetKey] = useState<DatasetKey>('monthly')
  const currentDataset = datasets[datasetKey]

  return (
    <AppPage className="gap-5 bg-transparent p-0">
      <AppPageHeader
        extra={
          <Badge className="hidden gap-1.5 bg-primary/10! text-primary! sm:inline-flex" variant="secondary">
            <ChartColumnStacked size={13} />
            组件测试页
          </Badge>
        }
        showHome={false}
        title="分段多组柱状图"
      />

      <Card className="gap-0! py-0">
        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4 sm:p-5">
          <div>
            <p className="font-medium">交互测试</p>
            <p className="mt-1 text-sm text-muted-foreground">切换数据集，悬停查看数值，点击图例隐藏或显示系列。</p>
          </div>
          <div className="flex items-center gap-2">
            <MousePointerClick className="text-muted-foreground" size={16} />
            <Select onValueChange={(value) => value && setDatasetKey(value as DatasetKey)} value={datasetKey}>
              <SelectTrigger aria-label="选择测试数据集" className="min-w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(datasets).map(([key, dataset]) => (
                  <SelectItem key={key} value={key}>{dataset.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <SegmentedMultipleBarChart
        data={currentDataset.data}
        height={240}
        maxChartWidth={680}
        maxValue={4000}
        segmentStep={200}
        series={series}
        title={
          <span className="flex items-center gap-2">
            Bar Chart 07 - Multiple
            <Badge className="border-violet-200 bg-violet-50 text-violet-600 dark:border-violet-400/20 dark:bg-violet-400/10 dark:text-violet-300" variant="outline">自研</Badge>
          </span>
        }
        valueFormatter={(value) => `${value.toLocaleString('zh-CN')} 次`}
      />
    </AppPage>
  )
}
