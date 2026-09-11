/**
 * 健康管理（Apple Health）页面所需的类型定义。
 * 当前全部由 src/api/health 下的模拟数据提供，后续可由后端同名接口替换。
 */

/** 时间范围，对应 Apple Health 的 日 / 周 / 月 / 6 个月 / 年 */
export type HealthRange = 'day' | 'week' | 'month' | 'sixMonths' | 'year'

/** Apple Health 浏览页的数据分类 */
export type HealthCategory =
  | 'activity'
  | 'heart'
  | 'sleep'
  | 'body'
  | 'vitals'
  | 'mindfulness'
  | 'hearing'
  | 'nutrition'
  | 'mobility'

/** 图表类型，决定指标卡的渲染方式 */
export type MetricChartType = 'bar' | 'line' | 'area' | 'stackedBar' | 'multiLine' | 'pie' | 'tile'

/** 区间聚合方式 */
export type MetricAggregate = 'sum' | 'avg' | 'max' | 'min' | 'last'

export type MetricTrend = 'up' | 'down' | 'flat'

/** good：处于参考范围或达成目标；watch：接近临界；alert：超出参考范围 */
export type MetricStatus = 'good' | 'watch' | 'alert'

/** 数值展示格式：普通数值或时刻（如入睡时间） */
export type MetricValueFormat = 'number' | 'time'

/** 多序列指标中的一条子序列，例如睡眠分期、血压的收缩压与舒张压 */
export type MetricSeriesKey = {
  key: string
  name: string
  color: string
  /** 子序列单独的时刻偏移，配合 valueFormat 使用 */
  timeShift?: number
}

/** 图表上的一个数据点，extra 承载多序列取值 */
export type MetricPoint = {
  date: string
  label: string
  value: number
  extra?: Record<string, number>
}

export type HealthMetric = {
  id: string
  name: string
  unit: string
  category: HealthCategory
  chartType: MetricChartType
  aggregate: MetricAggregate
  decimals: number
  valueFormat: MetricValueFormat
  /** 时刻类数值在展示时需要加上的小时偏移 */
  timeShift: number
  description?: string
  goal?: number
  lowerIsBetter?: boolean
  reference?: { min?: number; max?: number; label: string }
  seriesKeys?: MetricSeriesKey[]
  series: MetricPoint[]
  current: number
  previous: number
  changePercent: number
  trend: MetricTrend
  status: MetricStatus
  /** 当前序列实际覆盖的区间描述，例如「今日（按小时）」「近 30 天」 */
  rangeLabel: string
  /** 序列中最新的取值，用于概览卡片展示 */
  latest?: { label: string; value: number }
}

export type ActivityRing = {
  id: 'move' | 'exercise' | 'stand'
  name: string
  unit: string
  current: number
  goal: number
  color: string
}

export type GoalProgress = {
  id: string
  name: string
  unit: string
  target: number
  current: number
  decimals: number
}

export type ScoreBreakdown = {
  id: string
  name: string
  score: number
  detail: string
}

export type HealthProfile = {
  name: string
  age: number
  sex: string
  height: number
  weight: number
  bloodType: string
}

export type DataSource = {
  id: string
  name: string
  kind: 'device' | 'app' | 'manual'
  vendor: string
  records: number
  categories: string[]
  lastSyncAt: string
  status: '已连接' | '待授权'
}

export type HealthOverview = {
  profile: HealthProfile
  healthScore: number
  scoreTrend: number
  scoreBreakdown: ScoreBreakdown[]
  rings: ActivityRing[]
  goals: GoalProgress[]
  sources: DataSource[]
  recordCount: number
  categoryCount: number
  spanLabel: string
  lastSyncAt: string
  rangeLabel: string
}

export type Workout = {
  id: number
  type: string
  startedAt: string
  durationMinutes: number
  distanceKm: number | null
  activeEnergy: number
  averageHeartRate: number
  maxHeartRate: number
  source: string
}

export type TrainingLoadPoint = {
  label: string
  values: Record<string, number>
}

export type WorkoutSummary = {
  workouts: Workout[]
  totals: {
    count: number
    durationMinutes: number
    activeEnergy: number
    distanceKm: number
  }
  byType: { name: string; value: number; color: string }[]
  loadKeys: MetricSeriesKey[]
  weeklyLoad: TrainingLoadPoint[]
  rangeLabel: string
}

/** 实验室化验与症状等非时序记录 */
export type HealthRecord = {
  id: number
  category: 'lab' | 'symptom'
  name: string
  date: string
  value: number | null
  unit: string
  detail?: string
  reference?: string
  severity?: string
  status: MetricStatus
  source: string
}

export type Insight = {
  id: string
  tag: string
  title: string
  detail: string
  tone: 'positive' | 'neutral' | 'warning'
  changePercent?: number
  metricId?: string
}

export type Anomaly = {
  id: string
  title: string
  detail: string
  severity: 'info' | 'warning' | 'critical'
  date: string
  metricName: string
  value: string
  threshold: string
}

export type Correlation = {
  id: string
  title: string
  xName: string
  yName: string
  xUnit: string
  yUnit: string
  coefficient: number
  strength: string
  description: string
  points: { x: number; y: number }[]
}

export type PeriodComparison = {
  id: string
  name: string
  unit: string
  decimals: number
  current: number
  previous: number
  changePercent: number
  trend: MetricTrend
  lowerIsBetter?: boolean
}

export type HealthEventRecord = {
  id: string
  title: string
  date: string
  days: number
  detail: string
}

export type HealthAnalysis = {
  rangeLabel: string
  summary: string
  recommendations: string[]
  insights: Insight[]
  anomalies: Anomaly[]
  correlations: Correlation[]
  comparisons: PeriodComparison[]
  events: HealthEventRecord[]
}
