import { HttpResponse, delay, http } from 'msw'

import type {
  ActivityRing,
  Anomaly,
  Correlation,
  DataSource,
  GoalProgress,
  HealthAnalysis,
  HealthMetric,
  HealthOverview,
  HealthRange,
  HealthRecord,
  Insight,
  MetricAggregate,
  MetricChartType,
  MetricStatus,
  MetricTrend,
  PeriodComparison,
  ScoreBreakdown,
  Workout,
  WorkoutSummary,
  TrainingLoadPoint,
  MetricSeriesKey,
  HealthCategory,
} from '@/types/apps/health'
import { formatHealthValue, getRangeLabel } from '@/utils/health-format'

/**
 * Apple Health 模拟数据层。
 * 以固定的随机种子按天生成近一年的体征样本，再按 日/周/月/6 个月/年 聚合成图表序列，
 * 同时基于同一份样本推导健康评分、洞察、异常与相关性，保证页面各区块数据互相自洽。
 */

type ContextKey = 'activity' | 'sleep' | 'bedtime' | 'stress' | 'recovery' | 'nutrition' | 'fitness'
type Sensitivity = Partial<Record<ContextKey | 'sick', number>>

type DayContext = {
  date: Date
  dateKey: string
  weekday: number
  progress: number
  activity: number
  sleep: number
  bedtime: number
  stress: number
  recovery: number
  nutrition: number
  fitness: number
  sick: number
  metricEffects: Record<string, number>
  titles: string[]
}

type SeriesKeySpec = {
  key: string
  name: string
  color: string
  base: number
  noise: number
  decimals?: number
  timeShift?: number
  multipliers?: Sensitivity
  offsets?: Sensitivity
  min?: number
  max?: number
}

type MetricSpec = {
  id: string
  name: string
  unit: string
  category: HealthCategory
  chartType: MetricChartType
  aggregate: MetricAggregate
  base: number
  noise: number
  decimals?: number
  drift?: number
  weekly?: number[]
  multipliers?: Sensitivity
  offsets?: Sensitivity
  min?: number
  max?: number
  goal?: number
  lowerIsBetter?: boolean
  reference?: { min?: number; max?: number; label: string }
  description?: string
  granularity?: 'time' | 'event'
  hourlyProfile?: HourlyProfileName
  valueFormat?: 'number' | 'time'
  timeShift?: number
  keys?: SeriesKeySpec[]
  primaryKey?: string
}

type HealthEvent = {
  id: string
  title: string
  detail: string
  startOffset: number
  days: number
  sick?: number
  activity?: number
  sleep?: number
  bedtime?: number
  stress?: number
  metricEffects?: Record<string, number>
}

type DailySample = {
  date: Date
  dateKey: string
  value: number
  extra: Record<string, number>
}

type Bucket = { label: string; dateKey: string; start: Date; end: Date }
type BucketMode = 'hour' | 'day' | 'week' | 'month'
type HourlyProfileName = 'flat' | 'activity' | 'stand' | 'heart' | 'intake' | 'caffeine' | 'mindful' | 'audio'

const HISTORY_DAYS = 366
const DAY_MS = 86400000

const rangeDays: Record<HealthRange, number> = { day: 1, week: 7, month: 30, sixMonths: 182, year: 365 }

const palette = {
  primary: 'var(--primary)',
  move: '#f43f5e',
  exercise: '#84cc16',
  stand: '#06b6d4',
  deep: '#6366f1',
  core: '#38bdf8',
  rem: '#a78bfa',
  awake: '#f59e0b',
  systolic: '#ef4444',
  diastolic: '#fb923c',
  carbs: '#f59e0b',
  protein: '#10b981',
  fat: '#f43f5e',
  mood1: '#64748b',
  mood2: '#94a3b8',
  mood3: '#38bdf8',
  mood4: '#10b981',
  mood5: '#84cc16',
}

/** 周内节律：索引 0 为周日 */
const weekendUp = [1.12, 0.94, 0.95, 0.96, 0.97, 0.98, 1.1]
const weekdayUp = [0.82, 1.06, 1.05, 1.05, 1.04, 1.02, 0.9]

const hourlyProfiles: Record<HourlyProfileName, number[]> = {
  flat: Array.from({ length: 24 }, () => 1),
  activity: [0.4, 0.15, 0.08, 0.05, 0.05, 0.12, 0.7, 2.4, 3.2, 1.7, 1.1, 1.4, 2, 1.5, 1.1, 1.1, 1.4, 1.9, 2.6, 2.8, 1.9, 1.4, 1, 0.6],
  stand: [0, 0, 0, 0, 0, 0, 0.6, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0.8, 0.6, 0.4, 0.2],
  heart: [0.78, 0.75, 0.73, 0.72, 0.72, 0.75, 0.85, 0.95, 1.05, 1.05, 1.02, 1.05, 1.1, 1.06, 1.02, 1, 1.02, 1.06, 1.12, 1.14, 1.08, 1, 0.92, 0.84],
  intake: [0.3, 0.1, 0, 0, 0, 0.2, 1.2, 2, 2.2, 1.8, 1.2, 1.6, 1.4, 1.2, 1.4, 1.6, 1.8, 2, 1.8, 1.4, 1, 0.8, 0.5, 0.3],
  caffeine: [0, 0, 0, 0, 0, 0, 0.2, 1.2, 3, 2.6, 1.4, 0.9, 1, 0.6, 0.4, 0.2, 0.1, 0, 0, 0, 0, 0, 0, 0],
  mindful: [0.2, 0.1, 0.05, 0.05, 0.1, 0.6, 2.4, 2, 0.8, 0.5, 0.4, 0.6, 1.2, 0.6, 0.4, 0.5, 0.7, 0.9, 1.4, 1.8, 2.2, 1.6, 0.9, 0.4],
  audio: [0.6, 0.5, 0.5, 0.5, 0.5, 0.6, 0.8, 1, 1.15, 1.1, 0.9, 0.85, 1, 0.9, 0.85, 0.9, 1, 1.1, 1.25, 1.3, 1.2, 1, 0.85, 0.7],
}

const healthEvents: HealthEvent[] = [
  { id: 'cold', title: '轻度感冒', detail: '连续 4 天低热、鼻塞，静息心率与体温同步升高，训练量主动下调。', startOffset: 12, days: 4, sick: 1, activity: -0.65, sleep: -0.35, stress: 0.25 },
  { id: 'marathon', title: '半程马拉松', detail: '完成半程马拉松，当日步数与活动能量达到近半年峰值。', startOffset: 21, days: 1, metricEffects: { steps: 21000, exerciseMinutes: 96, activeEnergy: 780, distance: 21.4, restingHeartRate: 4 } },
  { id: 'deadline', title: '项目冲刺周', detail: '连续加班导致入睡推迟、深睡比例下降，情绪状态偏低。', startOffset: 34, days: 6, stress: 0.85, activity: -0.45, sleep: -0.5, bedtime: 0.7 },
  { id: 'hiking', title: '户外徒步假期', detail: '一周徒步假期，日均步数、正念分钟与情绪状态同步走高。', startOffset: 74, days: 7, activity: 0.95, stress: -0.6, sleep: 0.35 },
  { id: 'business-trip', title: '出差', detail: '出差期间作息紊乱，睡眠时长缩短约 40 分钟。', startOffset: 4, days: 3, bedtime: 1, sleep: -0.55, stress: 0.45, activity: -0.2 },
  { id: 'concert', title: '演唱会', detail: '现场环境音量与耳机音量均超过安全阈值。', startOffset: 5, days: 1, metricEffects: { headphoneAudio: 11, environmentalAudio: 21 } },
  { id: 'late-night', title: '熬夜加班', detail: '凌晨 1 点后入睡，咖啡因摄入较日常增加。', startOffset: 3, days: 1, metricEffects: { bedtime: 1.7, sleepDuration: -1.15, caffeine: 150 } },
  { id: 'hotpot', title: '高盐聚餐', detail: '单日钠摄入明显超标，饮水量不足。', startOffset: 2, days: 1, metricEffects: { sodium: 1350, water: -420, dietaryEnergy: 620 } },
]

const metricSpecs: MetricSpec[] = [
  {
    id: 'steps', name: '步数', unit: '步', category: 'activity', chartType: 'bar', aggregate: 'sum',
    base: 8600, noise: 0.14, drift: 0.08, weekly: weekendUp, goal: 10000, granularity: 'time', hourlyProfile: 'activity',
    multipliers: { activity: 0.42, sleep: 0.1, fitness: 0.12 }, offsets: { sick: -3000 },
    description: 'iPhone 与 Apple Watch 合并去重后的每日总步数。',
  },
  {
    id: 'activeEnergy', name: '活动能量', unit: '千卡', category: 'activity', chartType: 'bar', aggregate: 'sum',
    base: 520, noise: 0.15, drift: 0.07, weekly: weekendUp, goal: 620, granularity: 'time', hourlyProfile: 'activity',
    multipliers: { activity: 0.5, fitness: 0.1 }, offsets: { sick: -180 },
    description: '身体活动消耗的千卡数，对应活动圆环中的「活动」。',
  },
  {
    id: 'exerciseMinutes', name: '锻炼时长', unit: '分钟', category: 'activity', chartType: 'bar', aggregate: 'sum',
    base: 42, noise: 0.32, weekly: weekendUp, goal: 30, granularity: 'time', hourlyProfile: 'activity',
    multipliers: { activity: 0.55 }, offsets: { sick: -22 },
    description: '达到快走强度及以上的运动分钟数。',
  },
  {
    id: 'standHours', name: '站立小时', unit: '小时', category: 'activity', chartType: 'bar', aggregate: 'sum',
    base: 10.6, noise: 0.1, decimals: 1, weekly: weekdayUp, goal: 12, granularity: 'time', hourlyProfile: 'stand',
    multipliers: { activity: 0.16 }, offsets: { sick: -1.6 },
    description: '一小时内至少站立并活动 1 分钟的累计小时数。',
  },
  {
    id: 'distance', name: '步行+跑步距离', unit: '公里', category: 'activity', chartType: 'area', aggregate: 'sum',
    base: 6.2, noise: 0.16, decimals: 2, weekly: weekendUp, granularity: 'time', hourlyProfile: 'activity',
    multipliers: { activity: 0.45, fitness: 0.1 }, offsets: { sick: -2.2 },
    description: '步行与跑步的合计移动距离。',
  },
  {
    id: 'flights', name: '爬楼层数', unit: '层', category: 'activity', chartType: 'bar', aggregate: 'sum',
    base: 9, noise: 0.28, weekly: weekdayUp, granularity: 'time', hourlyProfile: 'activity',
    multipliers: { activity: 0.3 }, offsets: { sick: -4 },
    description: '气压计识别的爬楼层数（约 3 米高度差为一层）。',
  },
  {
    id: 'heartRate', name: '心率', unit: '次/分', category: 'heart', chartType: 'multiLine', aggregate: 'avg',
    base: 72, noise: 0.04, primaryKey: 'avg', granularity: 'time', hourlyProfile: 'heart',
    reference: { min: 50, max: 100, label: '常规范围 50–100 次/分' },
    description: '全天候心率采样，含最高、平均与最低三条曲线。',
    keys: [
      { key: 'max', name: '最高', color: '#ef4444', base: 112, noise: 0.08, multipliers: { activity: 0.08, stress: 0.05 }, offsets: { sick: 9 } },
      { key: 'avg', name: '平均', color: palette.primary, base: 72, noise: 0.05, multipliers: { stress: 0.06, fitness: -0.05 }, offsets: { sick: 7 } },
      { key: 'min', name: '最低', color: '#38bdf8', base: 54, noise: 0.06, offsets: { sick: 5, sleep: -1.2 } },
    ],
  },
  {
    id: 'restingHeartRate', name: '静息心率', unit: '次/分', category: 'heart', chartType: 'line', aggregate: 'avg',
    base: 58, noise: 0.025, drift: -0.05, granularity: 'event',
    reference: { min: 50, max: 70, label: '成人参考 50–70 次/分' },
    multipliers: { fitness: -0.06 }, offsets: { stress: 3.2, sleep: -1.2, sick: 7 },
    description: '清醒静息状态下的心率均值，数值越低通常代表心肺储备越好。',
  },
  {
    id: 'hrv', name: '心率变异性', unit: '毫秒', category: 'heart', chartType: 'line', aggregate: 'avg',
    base: 45, noise: 0.09, drift: 0.08, granularity: 'event',
    reference: { min: 35, max: 90, label: 'SDNN 参考 35–90 毫秒' },
    offsets: { stress: -6.5, sleep: 3.5, recovery: 2.5, sick: -9 },
    description: 'SDNN 心率变异性，反映自主神经恢复能力。',
  },
  {
    id: 'vo2Max', name: '最大摄氧量', unit: 'mL/kg·min', category: 'heart', chartType: 'line', aggregate: 'max',
    base: 41.5, noise: 0.018, drift: 0.07, decimals: 1, granularity: 'event',
    reference: { min: 38, label: '同龄优秀线 ≥ 42' },
    multipliers: { activity: 0.05, fitness: 0.06 },
    description: '心肺耐力（VO₂max）估算值，来自户外跑步与快走记录。',
  },
  {
    id: 'bloodPressure', name: '血压', unit: 'mmHg', category: 'heart', chartType: 'multiLine', aggregate: 'avg',
    base: 118, noise: 0.03, primaryKey: 'systolic', granularity: 'event',
    reference: { max: 128, label: '理想 < 120/80 mmHg' },
    description: '家用血压计同步的测量结果，展示收缩压与舒张压。',
    keys: [
      { key: 'systolic', name: '收缩压', color: palette.systolic, base: 118, noise: 0.035, offsets: { stress: 5, sick: 4, nutrition: 2 } },
      { key: 'diastolic', name: '舒张压', color: palette.diastolic, base: 76, noise: 0.045, offsets: { stress: 3.5, sick: 2.5, nutrition: 1.5 } },
    ],
  },
  {
    id: 'heartRateRecovery', name: '运动后心率恢复', unit: '次/分', category: 'heart', chartType: 'line', aggregate: 'avg',
    base: 25, noise: 0.1, drift: 0.05, granularity: 'event',
    reference: { min: 18, label: '≥ 18 次/分为正常' },
    offsets: { fitness: 1.6, stress: -1.6, sick: -4 },
    description: '运动结束 1 分钟后的心率下降幅度，数值越高代表心脏恢复越好。',
  },
  {
    id: 'sleepDuration', name: '睡眠时长', unit: '小时', category: 'sleep', chartType: 'stackedBar', aggregate: 'avg',
    base: 7.05, noise: 0.03, decimals: 2, granularity: 'event',
    reference: { min: 7, max: 9, label: '建议 7–9 小时' },
    description: '按睡眠分期堆叠展示，含深睡、核心、REM 与清醒时间。',
    keys: [
      { key: 'deep', name: '深睡', color: palette.deep, base: 1.35, noise: 0.11, decimals: 2, offsets: { sleep: 0.28, stress: -0.14, sick: -0.2 } },
      { key: 'core', name: '核心', color: palette.core, base: 3.85, noise: 0.05, decimals: 2, offsets: { sleep: 0.5, bedtime: -0.22 } },
      { key: 'rem', name: 'REM', color: palette.rem, base: 1.5, noise: 0.11, decimals: 2, offsets: { sleep: 0.3, bedtime: -0.16, stress: -0.1 } },
      { key: 'awake', name: '清醒', color: palette.awake, base: 0.32, noise: 0.28, decimals: 2, offsets: { stress: 0.14, bedtime: 0.12, sick: 0.18 } },
    ],
  },
  {
    id: 'bedtime', name: '入睡时间', unit: '', category: 'sleep', chartType: 'line', aggregate: 'avg',
    base: 5.3, noise: 0.025, decimals: 2, granularity: 'event', valueFormat: 'time', timeShift: 18,
    offsets: { bedtime: 1.15, stress: 0.3, sleep: -0.15 },
    description: '以 18:00 为基准的偏移小时数，避免跨零点造成的均值失真。',
  },
  {
    id: 'wakeTime', name: '醒来时间', unit: '', category: 'sleep', chartType: 'line', aggregate: 'avg',
    base: 7.05, noise: 0.02, decimals: 2, granularity: 'event', valueFormat: 'time',
    offsets: { bedtime: 0.55, sleep: 0.2, stress: 0.12 },
    description: '每日最后一次清醒的时间点。',
  },
  {
    id: 'sleepConsistency', name: '睡眠规律性', unit: '%', category: 'sleep', chartType: 'line', aggregate: 'avg',
    base: 79, noise: 0.045, granularity: 'event',
    reference: { min: 75, label: '≥ 75% 视为规律' },
    offsets: { bedtime: -7, stress: -3, recovery: 1.5 },
    description: '入睡与醒来时间的稳定程度，波动越小得分越高。',
  },
  {
    id: 'weight', name: '体重', unit: '公斤', category: 'body', chartType: 'line', aggregate: 'last',
    base: 73.2, noise: 0.004, drift: -0.05, decimals: 1, granularity: 'event', goal: 69,
    offsets: { nutrition: 0.35 },
    description: '体脂秤同步的晨起空腹体重。',
  },
  {
    id: 'bmi', name: '体质指数', unit: 'BMI', category: 'body', chartType: 'line', aggregate: 'last',
    base: 23.9, noise: 0.004, drift: -0.05, decimals: 1, granularity: 'event',
    reference: { min: 18.5, max: 24, label: '18.5–24 为正常范围' },
    description: '按身高 175 厘米与体重推算。',
  },
  {
    id: 'bodyFat', name: '体脂率', unit: '%', category: 'body', chartType: 'line', aggregate: 'last',
    base: 20.4, noise: 0.008, drift: -0.07, decimals: 1, granularity: 'event', lowerIsBetter: true,
    reference: { max: 20, label: '男性参考 ≤ 20%' },
    offsets: { nutrition: 0.3, activity: -0.2 },
    description: '生物电阻抗体脂秤测量结果。',
  },
  {
    id: 'height', name: '身高', unit: '厘米', category: 'body', chartType: 'tile', aggregate: 'last',
    base: 175, noise: 0, granularity: 'event', description: '健康 App 档案中登记的身高。',
  },
  {
    id: 'bodyTemperature', name: '体温', unit: '°C', category: 'vitals', chartType: 'multiLine', aggregate: 'avg',
    base: 36.9, noise: 0.004, decimals: 1, primaryKey: 'max', granularity: 'event',
    reference: { max: 37.3, label: '36.1–37.2 °C' },
    description: '腕温与口腔体温合并后的每日最高、最低值。',
    keys: [
      { key: 'max', name: '最高', color: '#ef4444', base: 36.9, noise: 0.005, decimals: 1, offsets: { sick: 0.9, stress: 0.12 } },
      { key: 'min', name: '最低', color: '#38bdf8', base: 36.25, noise: 0.005, decimals: 1, offsets: { sick: 0.5, sleep: -0.08 } },
    ],
  },
  {
    id: 'respiratoryRate', name: '呼吸频率', unit: '次/分', category: 'vitals', chartType: 'line', aggregate: 'avg',
    base: 15.2, noise: 0.045, decimals: 1, granularity: 'event',
    reference: { min: 12, max: 20, label: '12–20 次/分' },
    offsets: { stress: 0.9, sick: 1.5, sleep: -0.4 },
    description: '睡眠期间的平均呼吸频率。',
  },
  {
    id: 'bloodOxygen', name: '血氧饱和度', unit: '%', category: 'vitals', chartType: 'line', aggregate: 'min',
    base: 97.1, noise: 0.008, decimals: 1, granularity: 'event',
    reference: { min: 95, label: '≥ 95% 为正常' },
    offsets: { sick: -2.3, stress: -0.4 },
    description: '睡眠期间血氧饱和度的最低值。',
  },
  {
    id: 'wristTemperature', name: '腕温偏差', unit: '°C', category: 'vitals', chartType: 'line', aggregate: 'avg',
    base: -0.05, noise: 0.25, decimals: 2, granularity: 'event',
    reference: { max: 0.6, label: '−0.5 ~ 0.5 °C 为常态' },
    offsets: { sick: 0.9, sleep: -0.12 },
    description: '相对个人基线的腕部温度偏差。',
  },
  {
    id: 'mindfulMinutes', name: '正念分钟', unit: '分钟', category: 'mindfulness', chartType: 'bar', aggregate: 'sum',
    base: 18, noise: 0.36, drift: 0.12, goal: 20, granularity: 'time', hourlyProfile: 'mindful',
    offsets: { stress: 6 }, multipliers: { recovery: 0.1 },
    description: '冥想、呼吸练习与正念散步的累计时长。',
  },
  {
    id: 'stateOfMind', name: '情绪状态', unit: '分', category: 'mindfulness', chartType: 'line', aggregate: 'avg',
    base: 0.55, noise: 0.3, decimals: 2, granularity: 'event', min: -2, max: 2,
    reference: { min: 0, label: '−2（很不愉快）~ +2（很愉快）' },
    offsets: { stress: -0.7, sleep: 0.25, recovery: 0.2 },
    description: '「状态」记录中的情绪效价均值。',
  },
  {
    id: 'moodRecords', name: '情绪记录分布', unit: '条', category: 'mindfulness', chartType: 'pie', aggregate: 'sum',
    base: 1.35, noise: 0.2, granularity: 'event',
    description: '区间内情绪记录的分布情况。',
    keys: [
      { key: 'veryLow', name: '很不愉快', color: palette.mood1, base: 0.05, noise: 0.4, offsets: { stress: 0.06 } },
      { key: 'low', name: '不愉快', color: palette.mood2, base: 0.18, noise: 0.35, offsets: { stress: 0.12 } },
      { key: 'neutral', name: '中性', color: palette.mood3, base: 0.42, noise: 0.2 },
      { key: 'high', name: '愉快', color: palette.mood4, base: 0.46, noise: 0.2, offsets: { recovery: 0.1 } },
      { key: 'veryHigh', name: '很愉快', color: palette.mood5, base: 0.24, noise: 0.3, offsets: { recovery: 0.08, activity: 0.05 } },
    ],
  },
  {
    id: 'headphoneAudio', name: '耳机音量', unit: '分贝', category: 'hearing', chartType: 'line', aggregate: 'avg',
    base: 74, noise: 0.035, granularity: 'time', hourlyProfile: 'audio',
    reference: { max: 80, label: '建议 ≤ 80 分贝' },
    offsets: { stress: 2.5, activity: 1.5 },
    description: '耳机音频暴露的平均声压级。',
  },
  {
    id: 'environmentalAudio', name: '环境音量', unit: '分贝', category: 'hearing', chartType: 'bar', aggregate: 'max',
    base: 66, noise: 0.06, granularity: 'time', hourlyProfile: 'audio',
    reference: { max: 70, label: '建议 ≤ 70 分贝' },
    offsets: { activity: 4.5 },
    description: 'Apple Watch 麦克风采集的环境噪声峰值。',
  },
  {
    id: 'water', name: '饮水量', unit: '毫升', category: 'nutrition', chartType: 'bar', aggregate: 'sum',
    base: 1680, noise: 0.16, goal: 2000, granularity: 'time', hourlyProfile: 'intake',
    multipliers: { activity: 0.28 }, offsets: { stress: -120 },
    description: '含白水、茶与咖啡中的水分记录。',
  },
  {
    id: 'caffeine', name: '咖啡因', unit: '毫克', category: 'nutrition', chartType: 'line', aggregate: 'sum',
    base: 185, noise: 0.26, granularity: 'time', hourlyProfile: 'caffeine',
    reference: { max: 400, label: '每日 ≤ 400 毫克' },
    offsets: { stress: 60, bedtime: 25 },
    description: '咖啡、茶与功能饮料的咖啡因合计。',
  },
  {
    id: 'dietaryEnergy', name: '膳食能量', unit: '千卡', category: 'nutrition', chartType: 'line', aggregate: 'sum',
    base: 2080, noise: 0.07, goal: 2200, granularity: 'time', hourlyProfile: 'intake',
    multipliers: { nutrition: 0.12, activity: 0.1 },
    description: '饮食记录写入的每日摄入能量。',
  },
  {
    id: 'macros', name: '宏量营养素', unit: '克', category: 'nutrition', chartType: 'stackedBar', aggregate: 'sum',
    base: 404, noise: 0.05, granularity: 'time', hourlyProfile: 'intake',
    description: '碳水化合物、蛋白质与脂肪的每日摄入克数。',
    keys: [
      { key: 'carbs', name: '碳水化合物', color: palette.carbs, base: 245, noise: 0.08, multipliers: { nutrition: 0.14 } },
      { key: 'protein', name: '蛋白质', color: palette.protein, base: 96, noise: 0.09, multipliers: { activity: 0.15 } },
      { key: 'fat', name: '脂肪', color: palette.fat, base: 63, noise: 0.09, multipliers: { nutrition: 0.18 } },
    ],
  },
  {
    id: 'fiber', name: '膳食纤维', unit: '克', category: 'nutrition', chartType: 'line', aggregate: 'sum',
    base: 22, noise: 0.14, decimals: 1, goal: 28, granularity: 'time', hourlyProfile: 'intake',
    multipliers: { nutrition: 0.12 },
    description: '每日膳食纤维摄入量。',
  },
  {
    id: 'sodium', name: '钠', unit: '毫克', category: 'nutrition', chartType: 'line', aggregate: 'sum',
    base: 2280, noise: 0.1, granularity: 'time', hourlyProfile: 'intake', lowerIsBetter: true,
    reference: { max: 2300, label: '每日 ≤ 2300 毫克' },
    multipliers: { nutrition: 0.15 },
    description: '饮食记录中的钠摄入量。',
  },
  {
    id: 'walkingSpeed', name: '步行速度', unit: '公里/小时', category: 'mobility', chartType: 'line', aggregate: 'avg',
    base: 4.85, noise: 0.025, drift: 0.03, decimals: 2, granularity: 'event',
    reference: { min: 4.5, label: '≥ 4.5 公里/小时' },
    multipliers: { activity: 0.06, fitness: 0.03 },
    description: 'iPhone 携带状态下平地步行的平均速度。',
  },
  {
    id: 'stepLength', name: '步长', unit: '厘米', category: 'mobility', chartType: 'line', aggregate: 'avg',
    base: 68, noise: 0.02, drift: 0.02, decimals: 1, granularity: 'event',
    reference: { min: 65, label: '≥ 65 厘米' },
    multipliers: { fitness: 0.02 },
    description: '步行时的平均步幅长度。',
  },
  {
    id: 'walkingAsymmetry', name: '步行不对称性', unit: '%', category: 'mobility', chartType: 'line', aggregate: 'avg',
    base: 8.6, noise: 0.16, decimals: 1, granularity: 'event', lowerIsBetter: true,
    reference: { max: 10, label: '≤ 10% 视为对称' },
    offsets: { sick: 3.5, activity: -1.2 },
    description: '左右脚步态差异百分比，越低越对称。',
  },
  {
    id: 'stairSpeed', name: '爬楼速度', unit: '米/秒', category: 'mobility', chartType: 'line', aggregate: 'avg',
    base: 0.42, noise: 0.07, drift: 0.04, decimals: 2, granularity: 'event',
    reference: { min: 0.35, label: '≥ 0.35 米/秒' },
    multipliers: { activity: 0.08 },
    description: '爬楼梯时的平均垂直速度。',
  },
  {
    id: 'sixMinuteWalk', name: '六分钟步行', unit: '米', category: 'mobility', chartType: 'line', aggregate: 'max',
    base: 585, noise: 0.018, drift: 0.04, granularity: 'event',
    reference: { min: 550, label: '≥ 550 米为良好' },
    multipliers: { fitness: 0.04, activity: 0.03 },
    description: '六分钟步行测试距离，用于评估整体心肺功能。',
  },
]

const specIndex = new Map(metricSpecs.map((spec) => [spec.id, spec]))

/* ------------------------------------------------------------------ *
 * 随机数与日期工具
 * ------------------------------------------------------------------ */

function createRandom(seed: number) {
  let state = seed >>> 0 || 1
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function hashSeed(value: string) {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)
const rand1 = (random: () => number) => random() * 2 - 1

function roundTo(value: number, decimals: number) {
  const factor = 10 ** decimals
  return Math.round(value * factor) / factor
}

function startOfToday() {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  return now
}

function addDays(date: Date, days: number) {
  const next = new Date(date.getTime())
  next.setDate(next.getDate() + days)
  return next
}

function dateKeyOf(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function dayLabel(date: Date) {
  return `${date.getMonth() + 1}/${date.getDate()}`
}

function agoDate(days: number) {
  return addDays(startOfToday(), -days)
}

/* ------------------------------------------------------------------ *
 * 每日上下文：让各项指标之间存在真实的相互影响，便于后续相关性分析
 * ------------------------------------------------------------------ */

function eventRamp(position: number, days: number) {
  if (days <= 1) return 1
  if (position === 0) return 0.7
  if (position === days - 1) return 0.65
  return 1
}

function collectEventEffects(daysAgo: number) {
  const context = { activity: 0, sleep: 0, bedtime: 0, stress: 0, sick: 0 }
  const metrics: Record<string, number> = {}
  const titles: string[] = []
  for (const event of healthEvents) {
    if (daysAgo < event.startOffset || daysAgo >= event.startOffset + event.days) continue
    const ramp = eventRamp(daysAgo - event.startOffset, event.days)
    context.activity += (event.activity ?? 0) * ramp
    context.sleep += (event.sleep ?? 0) * ramp
    context.bedtime += (event.bedtime ?? 0) * ramp
    context.stress += (event.stress ?? 0) * ramp
    context.sick = Math.max(context.sick, (event.sick ?? 0) * ramp)
    for (const [metricId, effect] of Object.entries(event.metricEffects ?? {})) {
      metrics[metricId] = (metrics[metricId] ?? 0) + effect * ramp
    }
    titles.push(event.title)
  }
  return { context, metrics, titles }
}

const contextCache: DayContext[] = []

function getContexts(): DayContext[] {
  if (contextCache.length) return contextCache
  const random = createRandom(hashSeed('mindforge-health-context'))
  const today = startOfToday()
  for (let index = 0; index < HISTORY_DAYS; index += 1) {
    const date = addDays(today, -(HISTORY_DAYS - 1 - index))
    const progress = index / (HISTORY_DAYS - 1)
    const weekday = date.getDay()
    const weekend = weekday === 0 || weekday === 6
    const seasonal = Math.sin(progress * Math.PI * 2 - Math.PI / 2) * 0.25
    const events = collectEventEffects(HISTORY_DAYS - 1 - index)
    const fitness = progress * 0.6 - 0.3
    const stress = clamp(rand1(random) * 0.5 + (weekend ? -0.35 : 0.14) + Math.sin(progress * Math.PI * 9) * 0.12 + events.context.stress, -1, 1)
    const activity = clamp(rand1(random) * 0.45 + (weekend ? 0.28 : -0.05) + seasonal * 0.5 + fitness * 0.45 + events.context.activity, -1, 1)
    const bedtime = clamp(rand1(random) * 0.35 + (weekend ? 0.55 : 0) + stress * 0.3 + events.context.bedtime, -1.5, 2.4)
    const sleep = clamp(rand1(random) * 0.3 + (weekend ? 0.22 : 0) - stress * 0.42 - bedtime * 0.22 + fitness * 0.08 + events.context.sleep, -1, 1)
    const recovery = clamp(sleep * 0.6 - stress * 0.45 + rand1(random) * 0.22 - events.context.sick * 0.8, -1, 1)
    const nutrition = clamp(rand1(random) * 0.4 + (weekend ? 0.24 : 0) + stress * 0.18, -1, 1)
    contextCache.push({
      date,
      dateKey: dateKeyOf(date),
      weekday,
      progress,
      activity,
      sleep,
      bedtime,
      stress,
      recovery,
      nutrition,
      fitness,
      sick: events.context.sick,
      metricEffects: events.metrics,
      titles: events.titles,
    })
  }
  return contextCache
}

function sampleFrom(
  params: { base: number; noise: number; drift?: number; weekly?: number[]; multipliers?: Sensitivity; offsets?: Sensitivity; min?: number; max?: number },
  ctx: DayContext,
  random: () => number,
) {
  let value = params.base
  if (params.drift) value *= 1 + params.drift * ctx.progress
  for (const [key, factor] of Object.entries(params.multipliers ?? {})) {
    if (factor === undefined) continue
    value *= key === 'sick' ? 1 + factor * ctx.sick : 1 + factor * ctx[key as ContextKey]
  }
  for (const [key, offset] of Object.entries(params.offsets ?? {})) {
    if (offset === undefined) continue
    value += key === 'sick' ? offset * ctx.sick : offset * ctx[key as ContextKey]
  }
  if (params.weekly) value *= params.weekly[ctx.weekday]
  if (params.noise) value *= 1 + rand1(random) * params.noise
  return clamp(value, params.min ?? Number.NEGATIVE_INFINITY, params.max ?? Number.POSITIVE_INFINITY)
}

const dailyCache = new Map<string, DailySample[]>()

function getDailySamples(spec: MetricSpec): DailySample[] {
  const cached = dailyCache.get(spec.id)
  if (cached) return cached
  const decimals = spec.decimals ?? 0
  const random = createRandom(hashSeed(spec.id))
  const samples = getContexts().map((ctx) => {
    const extra: Record<string, number> = {}
    let value = sampleFrom(spec, ctx, random)
    if (spec.keys?.length) {
      for (const key of spec.keys) {
        const keyValue = sampleFrom(
          { base: key.base, noise: key.noise, drift: spec.drift, weekly: spec.weekly, multipliers: key.multipliers, offsets: key.offsets, min: key.min, max: key.max },
          ctx,
          random,
        )
        extra[key.key] = roundTo(keyValue, key.decimals ?? Math.max(decimals, 1))
      }
      value = spec.primaryKey ? extra[spec.primaryKey] ?? value : spec.keys.reduce((total, key) => total + (extra[key.key] ?? 0), 0)
    }
    // 事件级修正：多序列指标按比例分配到各子序列，保证堆叠图与总值一致
    const effect = ctx.metricEffects[spec.id]
    if (effect) {
      if (spec.keys?.length && value > 0.001) {
        const ratio = (value + effect) / value
        for (const key of spec.keys) extra[key.key] = roundTo((extra[key.key] ?? 0) * ratio, key.decimals ?? Math.max(decimals, 1))
      }
      value += effect
    }
    value = clamp(value, spec.min ?? Number.NEGATIVE_INFINITY, spec.max ?? Number.POSITIVE_INFINITY)
    return { date: ctx.date, dateKey: ctx.dateKey, value: roundTo(value, decimals), extra }
  })
  dailyCache.set(spec.id, samples)
  return samples
}

const hourlyCache = new Map<string, { value: number; extra: Record<string, number> }[]>()

function profileFactor(profile: number[], hour: number, aggregate: MetricAggregate) {
  const sum = profile.reduce((total, item) => total + item, 0) || 1
  return aggregate === 'sum' ? profile[hour] / sum : profile[hour] / (sum / 24)
}

function getHourlySamples(spec: MetricSpec, date: Date) {
  const key = `${spec.id}|${dateKeyOf(date)}`
  const cached = hourlyCache.get(key)
  if (cached) return cached
  const profile = hourlyProfiles[spec.hourlyProfile ?? 'flat']
  const daily = getDailySamples(spec).find((sample) => sample.dateKey === dateKeyOf(date))
  const random = createRandom(hashSeed(key))
  const decimals = spec.decimals ?? 0
  const hours = Array.from({ length: 24 }, (_, hour) => {
    const factor = profileFactor(profile, hour, spec.aggregate) * (1 + rand1(random) * 0.16)
    const extra: Record<string, number> = {}
    for (const seriesKey of spec.keys ?? []) {
      extra[seriesKey.key] = roundTo((daily?.extra[seriesKey.key] ?? 0) * factor, seriesKey.decimals ?? Math.max(decimals, 1))
    }
    return { value: roundTo((daily?.value ?? 0) * factor, decimals), extra }
  })
  hourlyCache.set(key, hours)
  return hours
}

/* ------------------------------------------------------------------ *
 * 区间分桶与聚合
 * ------------------------------------------------------------------ */

function dailyBuckets(today: Date, count: number): Bucket[] {
  return Array.from({ length: count }, (_, index) => {
    const start = addDays(today, -(count - 1 - index))
    return { label: dayLabel(start), dateKey: dateKeyOf(start), start, end: addDays(start, 1) }
  })
}

function weeklyBuckets(today: Date, count: number): Bucket[] {
  const end = addDays(today, 1)
  return Array.from({ length: count }, (_, index) => {
    const bucketEnd = addDays(end, -(count - 1 - index) * 7)
    const start = addDays(bucketEnd, -7)
    return { label: dayLabel(start), dateKey: dateKeyOf(start), start, end: bucketEnd }
  })
}

function monthlyBuckets(today: Date, count: number): Bucket[] {
  return Array.from({ length: count }, (_, index) => {
    const cursor = new Date(today.getFullYear(), today.getMonth() - (count - 1 - index), 1)
    const end = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1)
    return { label: `${cursor.getMonth() + 1}月`, dateKey: dateKeyOf(cursor), start: cursor, end }
  })
}

function hourlyBuckets(today: Date): Bucket[] {
  const currentHour = new Date().getHours()
  return Array.from({ length: currentHour + 1 }, (_, hour) => ({
    label: `${String(hour).padStart(2, '0')}:00`,
    dateKey: dateKeyOf(today),
    start: new Date(today.getFullYear(), today.getMonth(), today.getDate(), hour),
    end: new Date(today.getFullYear(), today.getMonth(), today.getDate(), hour + 1),
  }))
}

function resolveWindow(spec: MetricSpec, range: HealthRange): { mode: BucketMode; buckets: Bucket[]; rangeLabel: string; days: number } {
  const today = startOfToday()
  if (range === 'day' && (spec.granularity ?? 'time') === 'time') {
    return { mode: 'hour', buckets: hourlyBuckets(today), rangeLabel: '今日（按小时）', days: 1 }
  }
  if (range === 'day' || range === 'week') {
    return { mode: 'day', buckets: dailyBuckets(today, 7), rangeLabel: range === 'day' ? '近 7 天（日视图回退）' : '近 7 天', days: 7 }
  }
  if (range === 'month') return { mode: 'day', buckets: dailyBuckets(today, 30), rangeLabel: '近 30 天', days: 30 }
  if (range === 'sixMonths') return { mode: 'week', buckets: weeklyBuckets(today, 26), rangeLabel: '近 26 周', days: 182 }
  return { mode: 'month', buckets: monthlyBuckets(today, 12), rangeLabel: '近 12 个月', days: 365 }
}

function aggregateValues(values: number[], aggregate: MetricAggregate) {
  if (!values.length) return 0
  switch (aggregate) {
    case 'sum':
      return values.reduce((total, item) => total + item, 0)
    case 'avg':
      return values.reduce((total, item) => total + item, 0) / values.length
    case 'max':
      return Math.max(...values)
    case 'min':
      return Math.min(...values)
    case 'last':
      return values[values.length - 1] ?? 0
  }
}

function periodValue(samples: DailySample[], aggregate: MetricAggregate, days: number, offsetWindows = 0) {
  const end = samples.length - offsetWindows * days
  const start = Math.max(0, end - days)
  return aggregateValues(samples.slice(start, end).map((sample) => sample.value), aggregate)
}

function resolveStatus(spec: MetricSpec, value: number): MetricStatus {
  const reference = spec.reference
  if (reference) {
    if (reference.max !== undefined && value > reference.max) return value > reference.max * 1.06 ? 'alert' : 'watch'
    if (reference.min !== undefined && value < reference.min) return value < reference.min * 0.97 ? 'alert' : 'watch'
  }
  if (spec.goal) {
    const ratio = spec.lowerIsBetter ? spec.goal / Math.max(value, 0.0001) : value / spec.goal
    if (ratio >= 1) return 'good'
    return ratio >= 0.75 ? 'watch' : 'alert'
  }
  return 'good'
}

function resolveTrend(changePercent: number): MetricTrend {
  if (changePercent > 1) return 'up'
  if (changePercent < -1) return 'down'
  return 'flat'
}

const metricCache = new Map<string, HealthMetric>()

function buildMetric(spec: MetricSpec, range: HealthRange): HealthMetric {
  const cacheKey = `${spec.id}|${range}`
  const cached = metricCache.get(cacheKey)
  if (cached) return cached

  const timeWindow = resolveWindow(spec, range)
  const samples = getDailySamples(spec)
  const decimals = spec.decimals ?? 0
  const byKey = new Map(samples.map((sample) => [sample.dateKey, sample]))

  const points = timeWindow.mode === 'hour'
    ? timeWindow.buckets.map((bucket) => {
      const hourly = getHourlySamples(spec, bucket.start)[bucket.start.getHours()]
      return { date: bucket.dateKey, label: bucket.label, value: hourly?.value ?? 0, extra: hourly?.extra }
    })
    : spec.chartType === 'pie'
      ? (() => {
        const start = samples.length - timeWindow.days
        const slice = samples.slice(Math.max(0, start))
        const totals: Record<string, number> = {}
        for (const key of spec.keys ?? []) {
          totals[key.key] = Math.round(slice.reduce((total, sample) => total + (sample.extra[key.key] ?? 0), 0))
        }
        const total = Object.values(totals).reduce((sum, item) => sum + item, 0)
        return [{ date: dateKeyOf(startOfToday()), label: timeWindow.rangeLabel, value: total, extra: totals }]
      })()
      : timeWindow.buckets.map((bucket) => {
        const inBucket: DailySample[] = []
        const cursor = new Date(bucket.start.getTime())
        while (cursor.getTime() < bucket.end.getTime()) {
          const sample = byKey.get(dateKeyOf(cursor))
          if (sample) inBucket.push(sample)
          cursor.setTime(cursor.getTime() + DAY_MS)
        }
        const extra: Record<string, number> = {}
        for (const key of spec.keys ?? []) {
          extra[key.key] = roundTo(aggregateValues(inBucket.map((sample) => sample.extra[key.key] ?? 0), spec.aggregate), key.decimals ?? Math.max(decimals, 1))
        }
        return {
          date: bucket.dateKey,
          label: bucket.label,
          value: roundTo(aggregateValues(inBucket.map((sample) => sample.value), spec.aggregate), decimals),
          extra: spec.keys?.length ? extra : undefined,
        }
      })

  let current = periodValue(samples, spec.aggregate, timeWindow.days)
  const previous = periodValue(samples, spec.aggregate, timeWindow.days, 1)
  if (timeWindow.mode === 'hour') {
    current = aggregateValues(points.map((point) => point.value), spec.aggregate)
  }
  if (spec.chartType === 'pie') current = points[0]?.value ?? 0
  current = roundTo(current, decimals)
  const changePercent = previous ? roundTo(((current - previous) / Math.abs(previous)) * 100, 1) : 0

  const metric: HealthMetric = {
    id: spec.id,
    name: spec.name,
    unit: spec.unit,
    category: spec.category,
    chartType: spec.chartType,
    aggregate: spec.aggregate,
    decimals,
    valueFormat: spec.valueFormat ?? 'number',
    timeShift: spec.timeShift ?? 0,
    description: spec.description,
    goal: spec.goal,
    lowerIsBetter: spec.lowerIsBetter,
    reference: spec.reference,
    seriesKeys: spec.keys?.map(({ key, name, color, timeShift }) => ({ key, name, color, timeShift })),
    series: points,
    current,
    previous: roundTo(previous, decimals),
    changePercent,
    trend: resolveTrend(changePercent),
    status: resolveStatus(spec, current),
    rangeLabel: timeWindow.rangeLabel,
    latest: spec.aggregate === 'last' ? { label: points[points.length - 1]?.label ?? '', value: points[points.length - 1]?.value ?? current } : undefined,
  }
  metricCache.set(cacheKey, metric)
  return metric
}

function buildMetrics(range: HealthRange) {
  return metricSpecs.map((spec) => buildMetric(spec, range))
}

function windowSamples(specId: string, days: number, offsetWindows = 0) {
  const spec = specIndex.get(specId)
  if (!spec) return []
  const samples = getDailySamples(spec)
  const end = samples.length - offsetWindows * days
  return samples.slice(Math.max(0, end - days), end)
}

function windowAverage(specId: string, days: number, offsetWindows = 0, key?: string) {
  const samples = windowSamples(specId, days, offsetWindows)
  if (!samples.length) return 0
  const values = samples.map((sample) => (key ? sample.extra[key] ?? 0 : sample.value))
  return values.reduce((total, item) => total + item, 0) / values.length
}

function metricValue(metric: HealthMetric) {
  return formatHealthValue(metric.current, metric.decimals, metric.valueFormat, metric.timeShift)
}

function specOf(id: string) {
  return specIndex.get(id)
}

/* ------------------------------------------------------------------ *
 * 概览：健康评分、活动圆环、目标、数据来源
 * ------------------------------------------------------------------ */

function scoreBetween(value: number, worst: number, best: number) {
  if (best === worst) return 100
  return clamp(((value - worst) / (best - worst)) * 100, 0, 100)
}

function computeScoreBreakdown(offsetWindows = 0): ScoreBreakdown[] {
  const days = 30
  const vo2 = windowAverage('vo2Max', days, offsetWindows)
  const resting = windowAverage('restingHeartRate', days, offsetWindows)
  const hrv = windowAverage('hrv', days, offsetWindows)
  const sleep = windowAverage('sleepDuration', days, offsetWindows)
  const consistency = windowAverage('sleepConsistency', days, offsetWindows)
  const steps = windowAverage('steps', days, offsetWindows)
  const exercise = windowAverage('exerciseMinutes', days, offsetWindows)
  const bmi = windowAverage('bmi', days, offsetWindows)
  const bodyFat = windowAverage('bodyFat', days, offsetWindows)
  const mood = windowAverage('stateOfMind', days, offsetWindows)
  const mindful = windowAverage('mindfulMinutes', days, offsetWindows)
  const water = windowAverage('water', days, offsetWindows)
  const sodium = windowAverage('sodium', days, offsetWindows)

  const cardio = Math.round(scoreBetween(vo2, 32, 48) * 0.4 + scoreBetween(resting, 78, 48) * 0.3 + scoreBetween(hrv, 20, 75) * 0.3)
  const sleepScore = Math.round(scoreBetween(sleep, 5, 8) * 0.6 + scoreBetween(consistency, 50, 92) * 0.4)
  const activityScore = Math.round(scoreBetween(steps, 3000, 12000) * 0.55 + scoreBetween(exercise, 5, 55) * 0.45)
  const bodyScore = Math.round(scoreBetween(bmi, 30, 21) * 0.5 + scoreBetween(bodyFat, 30, 14) * 0.5)
  const moodScore = Math.round(scoreBetween(mood, -1.2, 1.4) * 0.55 + scoreBetween(mindful, 0, 30) * 0.45)
  const nutritionScore = Math.round(scoreBetween(water, 800, 2400) * 0.55 + scoreBetween(sodium, 4200, 1800) * 0.45)

  return [
    { id: 'cardio', name: '心肺耐力', score: cardio, detail: `VO₂max ${vo2.toFixed(1)} · 静息心率 ${Math.round(resting)} 次/分` },
    { id: 'sleep', name: '睡眠恢复', score: sleepScore, detail: `平均 ${sleep.toFixed(1)} 小时 · 规律性 ${Math.round(consistency)}%` },
    { id: 'activity', name: '活动水平', score: activityScore, detail: `日均 ${Math.round(steps).toLocaleString('zh-CN')} 步 · 锻炼 ${Math.round(exercise)} 分钟` },
    { id: 'body', name: '身体成分', score: bodyScore, detail: `BMI ${bmi.toFixed(1)} · 体脂率 ${bodyFat.toFixed(1)}%` },
    { id: 'mood', name: '情绪与正念', score: moodScore, detail: `情绪 ${mood.toFixed(2)} 分 · 正念 ${Math.round(mindful)} 分钟` },
    { id: 'nutrition', name: '营养代谢', score: nutritionScore, detail: `饮水 ${Math.round(water)} 毫升 · 钠 ${Math.round(sodium)} 毫克` },
  ]
}

const dataSources: DataSource[] = [
  { id: 'watch', name: 'Apple Watch Series 10', kind: 'device', vendor: 'Apple', records: 128460, categories: ['活动', '心脏', '睡眠', '正念', '听觉', '移动能力'], lastSyncAt: '', status: '已连接' },
  { id: 'iphone', name: 'iPhone 16 Pro', kind: 'device', vendor: 'Apple', records: 86230, categories: ['活动', '移动能力', '听觉', '营养'], lastSyncAt: '', status: '已连接' },
  { id: 'withings', name: 'Withings Body+', kind: 'device', vendor: 'Withings', records: 1820, categories: ['身体测量'], lastSyncAt: '', status: '已连接' },
  { id: 'omron', name: '欧姆龙 J710 血压计', kind: 'device', vendor: 'Omron', records: 364, categories: ['心脏'], lastSyncAt: '', status: '已连接' },
  { id: 'manual', name: '健康 App 手动录入', kind: 'manual', vendor: 'Apple', records: 942, categories: ['营养', '症状', '实验室'], lastSyncAt: '', status: '已连接' },
  { id: 'keep', name: 'Keep', kind: 'app', vendor: 'Keep', records: 214, categories: ['体能训练'], lastSyncAt: '', status: '已连接' },
  { id: 'autosleep', name: 'AutoSleep', kind: 'app', vendor: 'Tantsissa', records: 3120, categories: ['睡眠'], lastSyncAt: '', status: '待授权' },
]

function buildOverview(range: HealthRange, metrics: HealthMetric[]): HealthOverview {
  const today = startOfToday()
  const metricById = new Map(metrics.map((metric) => [metric.id, metric]))
  const breakdown = computeScoreBreakdown()
  const previousBreakdown = computeScoreBreakdown(1)
  const weights = { cardio: 0.22, sleep: 0.2, activity: 0.2, body: 0.14, mood: 0.12, nutrition: 0.12 }
  const weighted = (items: ScoreBreakdown[]) =>
    items.reduce((total, item) => total + item.score * (weights[item.id as keyof typeof weights] ?? 0.15), 0)
  const healthScore = Math.round(weighted(breakdown))
  const scoreTrend = roundTo(weighted(breakdown) - weighted(previousBreakdown), 1)

  const todayValue = (id: string) => {
    const spec = specOf(id)
    if (!spec) return 0
    const sample = getDailySamples(spec).find((item) => item.dateKey === dateKeyOf(today))
    return sample?.value ?? 0
  }

  const rings: ActivityRing[] = [
    { id: 'move', name: '活动', unit: '千卡', current: Math.round(todayValue('activeEnergy')), goal: 620, color: palette.move },
    { id: 'exercise', name: '锻炼', unit: '分钟', current: Math.round(todayValue('exerciseMinutes')), goal: 30, color: palette.exercise },
    { id: 'stand', name: '站立', unit: '小时', current: Math.round(todayValue('standHours')), goal: 12, color: palette.stand },
  ]

  const goals: GoalProgress[] = metricSpecs
    .filter((spec) => spec.goal !== undefined)
    .map((spec) => {
      const metric = metricById.get(spec.id)
      const current = range === 'day' ? todayValue(spec.id) : metric?.current ?? 0
      return { id: spec.id, name: spec.name, unit: spec.unit, target: spec.goal ?? 0, current: roundTo(current, spec.decimals ?? 0), decimals: spec.decimals ?? 0 }
    })

  const lastSync = new Date()
  lastSync.setMinutes(lastSync.getMinutes() - 7, 0, 0)
  const sources = dataSources.map((source, index) => ({
    ...source,
    lastSyncAt: new Date(lastSync.getTime() - index * 47 * 60000).toISOString(),
  }))

  const weight = metricById.get('weight')
  const start = addDays(today, -(HISTORY_DAYS - 1))

  return {
    profile: {
      name: '李明',
      age: 32,
      sex: '男',
      height: 175,
      weight: weight?.current ?? 71.6,
      bloodType: 'O 型',
    },
    healthScore,
    scoreTrend,
    scoreBreakdown: breakdown,
    rings,
    goals,
    sources,
    recordCount: sources.reduce((total, source) => total + source.records, 0),
    categoryCount: 13,
    spanLabel: `${start.getFullYear()}年${start.getMonth() + 1}月${start.getDate()}日 – ${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日`,
    lastSyncAt: lastSync.toISOString(),
    rangeLabel: getRangeLabel(range),
  }
}

/* ------------------------------------------------------------------ *
 * 体能训练
 * ------------------------------------------------------------------ */

const workoutTypes = [
  { name: '户外跑步', color: '#f43f5e', speed: 9.6, minutes: [30, 55], heartRate: 152, kcalPerMin: 11.4 },
  { name: '室内骑行', color: '#06b6d4', speed: 24.5, minutes: [35, 70], heartRate: 138, kcalPerMin: 9.2 },
  { name: '力量训练', color: '#6366f1', speed: 0, minutes: [40, 70], heartRate: 124, kcalPerMin: 7.4 },
  { name: '瑜伽', color: '#a78bfa', speed: 0, minutes: [25, 50], heartRate: 96, kcalPerMin: 4.2 },
  { name: '游泳', color: '#38bdf8', speed: 2.7, minutes: [30, 50], heartRate: 143, kcalPerMin: 10.1 },
  { name: '健走', color: '#84cc16', speed: 5.6, minutes: [30, 60], heartRate: 112, kcalPerMin: 5.6 },
  { name: 'HIIT', color: '#f59e0b', speed: 0, minutes: [20, 35], heartRate: 163, kcalPerMin: 12.4 },
  { name: '椭圆机', color: '#14b8a6', speed: 0, minutes: [25, 45], heartRate: 132, kcalPerMin: 8.3 },
]

let workoutCache: Workout[] | null = null

function buildAllWorkouts(): Workout[] {
  if (workoutCache) return workoutCache
  const random = createRandom(hashSeed('mindforge-health-workouts'))
  const contexts = getContexts()
  const workouts: Workout[] = []
  let id = 1
  for (const ctx of contexts) {
    const weekend = ctx.weekday === 0 || ctx.weekday === 6
    const probability = clamp(0.3 + ctx.activity * 0.34 + (weekend ? 0.12 : 0) - ctx.sick * 0.65, 0, 0.92)
    if (random() > probability) continue
    const typeIndex = Math.floor(random() * workoutTypes.length)
    const type = workoutTypes[typeIndex]
    const [minMinutes, maxMinutes] = type.minutes
    const duration = Math.round(minMinutes + random() * (maxMinutes - minMinutes) + ctx.activity * 8)
    const morning = random() < 0.42
    const hour = morning ? 6 + Math.floor(random() * 3) : 18 + Math.floor(random() * 3)
    const startedAt = new Date(ctx.date.getTime())
    startedAt.setHours(hour, Math.floor(random() * 60), 0, 0)
    const averageHeartRate = Math.round(type.heartRate + rand1(random) * 8 + ctx.stress * 3)
    workouts.push({
      id: id++,
      type: type.name,
      startedAt: startedAt.toISOString(),
      durationMinutes: duration,
      distanceKm: type.speed ? roundTo((duration / 60) * type.speed * (1 + rand1(random) * 0.06), 2) : null,
      activeEnergy: Math.round(duration * type.kcalPerMin * (1 + rand1(random) * 0.08)),
      averageHeartRate,
      maxHeartRate: averageHeartRate + Math.round(18 + random() * 16),
      source: type.name === '力量训练' || type.name === '瑜伽' ? 'Keep' : 'Apple Watch',
    })
  }
  workoutCache = workouts.reverse()
  return workoutCache
}

function buildWorkoutSummary(range: HealthRange): WorkoutSummary {
  const days = range === 'day' ? 7 : rangeDays[range]
  // 训练负荷：日与周视图按天分桶，月及以上按周/月分桶，最多 12 个桶
  const span = range === 'year' ? 30 : range === 'sixMonths' || range === 'month' ? 7 : 1
  const bucketCount = range === 'year' || range === 'sixMonths' ? 12 : range === 'month' ? 5 : 7
  const cutoff = addDays(startOfToday(), -Math.max(days, span * bucketCount)).getTime()
  const workouts = buildAllWorkouts().filter((workout) => new Date(workout.startedAt).getTime() >= cutoff)

  const counts = new Map<string, number>()
  for (const workout of workouts) counts.set(workout.type, (counts.get(workout.type) ?? 0) + 1)
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1])
  const byType = sorted.map(([name, value], index) => ({
    name,
    value,
    color: workoutTypes.find((type) => type.name === name)?.color ?? `var(--chart-${(index % 5) + 1})`,
  }))

  const topTypes = sorted.slice(0, 5).map(([name]) => name)
  const loadKeys: MetricSeriesKey[] = [
    ...topTypes.map((name) => ({ key: name, name, color: workoutTypes.find((type) => type.name === name)?.color ?? palette.primary })),
    { key: 'other', name: '其他', color: '#94a3b8' },
  ]

  const today = startOfToday()
  // 列表与统计只取所选区间，负荷图额外覆盖更早的分桶，避免首尾桶为空
  const rangeStart = addDays(today, -days).getTime()
  const workoutsInRange = workouts.filter((workout) => new Date(workout.startedAt).getTime() >= rangeStart)
  const weeklyLoad: TrainingLoadPoint[] = Array.from({ length: bucketCount }, (_, index) => {
    const end = addDays(today, 1 - (bucketCount - 1 - index) * span)
    const start = addDays(end, -span)
    const values: Record<string, number> = {}
    for (const key of loadKeys) values[key.key] = 0
    for (const workout of workouts) {
      const time = new Date(workout.startedAt).getTime()
      if (time < start.getTime() || time >= end.getTime()) continue
      const key = topTypes.includes(workout.type) ? workout.type : 'other'
      values[key] = (values[key] ?? 0) + workout.durationMinutes
    }
    return { label: span > 1 ? `${start.getMonth() + 1}/${start.getDate()}` : dayLabel(start), values }
  })

  return {
    workouts: workoutsInRange,
    totals: {
      count: workoutsInRange.length,
      durationMinutes: workoutsInRange.reduce((total, item) => total + item.durationMinutes, 0),
      activeEnergy: workoutsInRange.reduce((total, item) => total + item.activeEnergy, 0),
      distanceKm: roundTo(workoutsInRange.reduce((total, item) => total + (item.distanceKm ?? 0), 0), 1),
    },
    byType,
    loadKeys,
    weeklyLoad,
    rangeLabel: range === 'day' ? '近 7 天' : getRangeLabel(range),
  }
}

/* ------------------------------------------------------------------ *
 * 实验室化验与症状记录
 * ------------------------------------------------------------------ */

type LabSpec = { name: string; daysAgo: number; value: string; unit: string; status: MetricStatus; detail?: string }

function buildRecords(): HealthRecord[] {
  const labs: LabSpec[] = [
    { name: '空腹血糖', daysAgo: 18, value: '5.4', unit: 'mmol/L', status: 'good' },
    { name: '糖化血红蛋白', daysAgo: 96, value: '5.3', unit: '%', status: 'good' },
    { name: '总胆固醇', daysAgo: 96, value: '4.9', unit: 'mmol/L', status: 'good' },
    { name: '低密度脂蛋白', daysAgo: 96, value: '3.1', unit: 'mmol/L', status: 'good' },
    { name: '高密度脂蛋白', daysAgo: 96, value: '1.28', unit: 'mmol/L', status: 'good' },
    { name: '甘油三酯', daysAgo: 96, value: '1.6', unit: 'mmol/L', status: 'good' },
    { name: '维生素 D', daysAgo: 42, value: '27.5', unit: 'ng/mL', status: 'watch', detail: '低于参考范围下限，建议增加日照并复查 25-(OH)D。' },
    { name: '尿酸', daysAgo: 132, value: '386', unit: 'µmol/L', status: 'good' },
    { name: '血红蛋白', daysAgo: 132, value: '152', unit: 'g/L', status: 'good' },
    { name: '促甲状腺激素', daysAgo: 210, value: '1.9', unit: 'mIU/L', status: 'good' },
  ]
  const labReferences: Record<string, string> = {
    空腹血糖: '3.9 – 6.1 mmol/L',
    糖化血红蛋白: '< 5.7%',
    总胆固醇: '< 5.2 mmol/L',
    低密度脂蛋白: '< 3.4 mmol/L',
    高密度脂蛋白: '> 1.0 mmol/L',
    甘油三酯: '< 1.7 mmol/L',
    '维生素 D': '30 – 100 ng/mL',
    尿酸: '< 420 µmol/L',
    血红蛋白: '130 – 175 g/L',
    促甲状腺激素: '0.4 – 4.0 mIU/L',
  }

  const symptoms: [string, number, string, string, string][] = [
    ['头痛', 12, '轻度', '感冒期间晨起胀痛，持续约 2 小时。', '手动录入'],
    ['疲劳', 11, '中度', '感冒第 2 天明显乏力，训练计划取消。', '手动录入'],
    ['鼻塞', 13, '中度', '夜间鼻塞影响睡眠连续性。', '手动录入'],
    ['心悸', 34, '轻度', '冲刺周加班后偶发心悸，休息后缓解。', 'Apple Watch'],
    ['腰背疼痛', 33, '轻度', '久坐 6 小时后腰部酸胀。', '手动录入'],
    ['头晕', 22, '轻度', '半程马拉松终点后短暂头晕。', '手动录入'],
    ['肌肉酸痛', 21, '中度', '马拉松次日大腿前侧酸痛。', '手动录入'],
    ['焦虑', 35, '轻度', '项目上线前的紧张情绪记录。', '状态 App'],
  ]

  let id = 1
  const records: HealthRecord[] = [
    ...labs.map((lab) => ({
      id: id++,
      category: 'lab' as const,
      name: lab.name,
      date: dateKeyOf(agoDate(lab.daysAgo)),
      value: Number(lab.value),
      unit: lab.unit,
      reference: labReferences[lab.name],
      status: lab.status,
      source: '医院检验科',
      detail: lab.detail,
    })),
    ...symptoms.map(([name, daysAgo, severity, note, source]) => ({
      id: id++,
      category: 'symptom' as const,
      name,
      date: dateKeyOf(agoDate(daysAgo)),
      value: null,
      unit: '',
      detail: note,
      severity,
      status: severity === '中度' ? 'watch' as MetricStatus : 'good' as MetricStatus,
      source,
    })),
  ]
  return records.sort((a, b) => (a.date < b.date ? 1 : -1))
}

/* ------------------------------------------------------------------ *
 * 分析：洞察、异常、相关性、周期对比
 * ------------------------------------------------------------------ */

const insightNotes: Record<string, { positive: string; negative: string }> = {
  steps: { positive: '日常活动量稳步提升，工作日每小时起身活动 2–3 分钟可以进一步减少久坐。', negative: '久坐时间偏长，建议每天安排两次 10 分钟快走，并把通勤中的一部分改为步行。' },
  activeEnergy: { positive: '活动能量消耗上升，与训练频次增加一致，注意同步补充蛋白质。', negative: '活动能量下降，可通过增加力量训练提高基础代谢。' },
  exerciseMinutes: { positive: '中高强度运动时间充足，已达到 WHO 每周 150 分钟的建议。', negative: '中高强度运动不足，建议每周安排 3 次 30 分钟以上的有氧训练。' },
  sleepDuration: { positive: '睡眠时长回到推荐区间，深睡比例同步提升。', negative: '睡眠时长低于 7 小时，建议把入睡时间固定在 23:30 前并减少晚间屏幕使用。' },
  sleepConsistency: { positive: '作息规律性改善，有助于稳定昼夜节律。', negative: '作息波动较大，周末补觉会削弱节律稳定性。' },
  restingHeartRate: { positive: '静息心率下降，说明心肺储备与恢复能力在改善。', negative: '静息心率升高，通常与疲劳、压力或生病相关，建议安排减量恢复周。' },
  hrv: { positive: '心率变异性提升，自主神经恢复能力增强。', negative: '心率变异性下降，提示近期负荷偏高，可增加呼吸训练与睡眠时长。' },
  vo2Max: { positive: '最大摄氧量持续上升，有氧训练安排有效。', negative: '最大摄氧量停滞，可加入间歇跑提升有氧上限。' },
  weight: { positive: '体重按预期缓慢下降，减重速度处于健康区间（每周 < 0.5 公斤）。', negative: '体重回升，建议核对膳食能量与活动能量的差值。' },
  bodyFat: { positive: '体脂率下降，同时保持了肌肉量。', negative: '体脂率上升，建议增加抗阻训练并控制精制碳水。' },
  water: { positive: '饮水量达标，有助于代谢与运动表现。', negative: '饮水量不足，建议设置每小时提醒并随身准备水杯。' },
  mindfulMinutes: { positive: '正念练习频次提升，情绪状态同步改善。', negative: '正念练习减少，可从每天 5 分钟呼吸练习重新开始。' },
  headphoneAudio: { positive: '耳机音量控制在安全范围内。', negative: '耳机音量偏高，长时间暴露会造成不可逆的听力损伤，建议开启音量限制。' },
  sodium: { positive: '钠摄入回落到推荐范围。', negative: '钠摄入超过推荐值，建议减少外卖与加工食品。' },
  stateOfMind: { positive: '情绪状态整体积极，与规律运动正相关。', negative: '情绪状态偏低，可结合正念练习与户外散步调整。' },
  bloodOxygen: { positive: '血氧饱和度稳定在正常区间。', negative: '血氧出现低于 95% 的记录，若伴随打鼾或白天嗜睡建议就医评估。' },
}

function buildInsights(metrics: HealthMetric[]): Insight[] {
  const keyIds = ['steps', 'exerciseMinutes', 'sleepDuration', 'sleepConsistency', 'restingHeartRate', 'hrv', 'vo2Max', 'weight', 'bodyFat', 'water', 'mindfulMinutes', 'headphoneAudio', 'sodium', 'stateOfMind', 'bloodOxygen']
  const insights: Insight[] = []
  const categoryNames: Record<string, string> = {
    activity: '活动', heart: '心脏', sleep: '睡眠', body: '身体测量', vitals: '生命体征',
    mindfulness: '正念', hearing: '听觉', nutrition: '营养', mobility: '移动能力',
  }
  for (const id of keyIds) {
    const metric = metrics.find((item) => item.id === id)
    if (!metric) continue
    const magnitude = Math.abs(metric.changePercent)
    if (magnitude < 1.5) continue
    const improving = metric.lowerIsBetter ? metric.changePercent < 0 : metric.changePercent > 0
    const notes = insightNotes[id]
    const tone: Insight['tone'] = magnitude < 3 ? 'neutral' : improving ? 'positive' : 'warning'
    const direction = metric.changePercent > 0 ? '上升' : '下降'
    insights.push({
      id: `insight-${id}`,
      tag: categoryNames[metric.category] ?? metric.category,
      title: `${metric.name}${direction} ${Math.abs(metric.changePercent).toFixed(1)}%`,
      detail: `${metric.rangeLabel}${metric.aggregate === 'sum' ? '合计' : '平均'} ${metricValue(metric)}${metric.unit}，上一周期为 ${formatHealthValue(metric.previous, metric.decimals, metric.valueFormat, metric.timeShift)}${metric.unit}。${notes ? (improving ? notes.positive : notes.negative) : '建议持续观察后续变化。'}`,
      tone,
      changePercent: metric.changePercent,
      metricId: id,
    })
  }
  return insights.sort((a, b) => Math.abs(b.changePercent ?? 0) - Math.abs(a.changePercent ?? 0))
}

type AnomalyRule = {
  metricId: string
  key?: string
  title: string
  threshold: string
  severity: Anomaly['severity']
  test: (value: number) => boolean
  advice: string
}

const anomalyRules: AnomalyRule[] = [
  { metricId: 'bloodOxygen', title: '血氧饱和度偏低', threshold: '< 95%', severity: 'critical', test: (value) => value < 95, advice: '若伴随夜间打鼾、白天嗜睡，建议进行睡眠呼吸评估。' },
  { metricId: 'bodyTemperature', key: 'max', title: '体温升高', threshold: '> 37.2 °C', severity: 'warning', test: (value) => value > 37.2, advice: '结合症状记录判断是否存在感染，注意补水与休息。' },
  { metricId: 'restingHeartRate', title: '静息心率偏高', threshold: '> 68 次/分', severity: 'warning', test: (value) => value > 68, advice: '通常与疲劳、压力或疾病相关，建议安排恢复日。' },
  { metricId: 'sleepDuration', title: '睡眠时长不足', threshold: '< 6.5 小时', severity: 'warning', test: (value) => value < 6.5, advice: '连续睡眠不足会削弱免疫与代谢，建议固定入睡时间。' },
  { metricId: 'headphoneAudio', title: '耳机音量超标', threshold: '> 80 分贝', severity: 'warning', test: (value) => value > 80, advice: '在设置中开启耳机音量限制，单次暴露不要超过 60 分钟。' },
  { metricId: 'environmentalAudio', title: '环境噪声暴露过高', threshold: '> 85 分贝', severity: 'info', test: (value) => value > 85, advice: '长时间处于高噪声环境时建议佩戴降噪耳塞。' },
  { metricId: 'bloodPressure', key: 'systolic', title: '收缩压偏高', threshold: '> 130 mmHg', severity: 'warning', test: (value) => value > 130, advice: '连续多日偏高时应就医评估，同时控制钠摄入。' },
  { metricId: 'sodium', title: '钠摄入超标', threshold: '> 2900 毫克', severity: 'info', test: (value) => value > 2900, advice: '减少加工食品与外卖，当日增加饮水帮助代谢。' },
  { metricId: 'hrv', title: '心率变异性骤降', threshold: '< 32 毫秒', severity: 'info', test: (value) => value < 32, advice: '提示恢复不足，建议降低训练强度并保证睡眠。' },
]

function buildAnomalies(): Anomaly[] {
  const contexts = getContexts()
  const anomalies: Anomaly[] = []
  for (const rule of anomalyRules) {
    const spec = specOf(rule.metricId)
    if (!spec) continue
    const samples = getDailySamples(spec).slice(-90)
    const decimals = spec.decimals ?? 0
    for (const sample of samples) {
      const value = rule.key ? sample.extra[rule.key] ?? 0 : sample.value
      if (!rule.test(value)) continue
      const ctx = contexts.find((item) => item.dateKey === sample.dateKey)
      anomalies.push({
        id: `${rule.metricId}-${sample.dateKey}`,
        title: rule.title,
        detail: `${rule.advice}${ctx?.titles.length ? `（当日：${ctx.titles.join('、')}）` : ''}`,
        severity: rule.severity,
        date: sample.dateKey,
        metricName: rule.key ? `${spec.name}·${spec.keys?.find((key) => key.key === rule.key)?.name ?? ''}` : spec.name,
        value: `${formatHealthValue(value, decimals)}${spec.unit}`,
        threshold: rule.threshold,
      })
    }
  }
  return anomalies.sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 10)
}

function pearson(xs: number[], ys: number[]) {
  const count = Math.min(xs.length, ys.length)
  if (count < 3) return 0
  const meanX = xs.reduce((total, item) => total + item, 0) / count
  const meanY = ys.reduce((total, item) => total + item, 0) / count
  let numerator = 0
  let dx = 0
  let dy = 0
  for (let index = 0; index < count; index += 1) {
    const a = xs[index] - meanX
    const b = ys[index] - meanY
    numerator += a * b
    dx += a * a
    dy += b * b
  }
  const denominator = Math.sqrt(dx * dy)
  return denominator === 0 ? 0 : numerator / denominator
}

function correlationStrength(coefficient: number) {
  const magnitude = Math.abs(coefficient)
  if (magnitude >= 0.7) return '强相关'
  if (magnitude >= 0.45) return '中等相关'
  if (magnitude >= 0.25) return '弱相关'
  return '相关性很弱'
}

type CorrelationSpec = { id: string; title: string; x: string; y: string; lag: number; explain: (coefficient: number) => string }

const correlationSpecs: CorrelationSpec[] = [
  { id: 'sleep-steps', title: '睡眠时长 → 次日步数', x: 'sleepDuration', y: 'steps', lag: 1, explain: (r) => r > 0.25 ? '睡得足够的那一晚，第二天的活动量明显更高。' : '睡眠时长与次日活动量关联较弱。' },
  { id: 'exercise-restinghr', title: '锻炼时长 → 静息心率', x: 'exerciseMinutes', y: 'restingHeartRate', lag: 0, explain: (r) => r < -0.2 ? '运动量提升伴随静息心率下降，心肺适应性改善。' : '当日运动量对静息心率影响不明显。' },
  { id: 'caffeine-bedtime', title: '咖啡因摄入 → 入睡时间', x: 'caffeine', y: 'bedtime', lag: 0, explain: (r) => r > 0.2 ? '咖啡因摄入越多，入睡时间越晚，建议下午 2 点后停止摄入。' : '咖啡因与入睡时间关联较弱。' },
  { id: 'mindful-mood', title: '正念分钟 → 情绪状态', x: 'mindfulMinutes', y: 'stateOfMind', lag: 0, explain: (r) => r > 0.2 ? '正念练习与更积极的情绪状态相关。' : '正念练习与情绪状态关联较弱。' },
  { id: 'stress-hrv', title: '睡眠规律性 → 心率变异性', x: 'sleepConsistency', y: 'hrv', lag: 1, explain: (r) => r > 0.2 ? '作息越规律，次日自主神经恢复能力越好。' : '作息规律性对心率变异性影响有限。' },
]

function buildCorrelations(): Correlation[] {
  const windowSize = 90
  return correlationSpecs.flatMap((spec) => {
    const xSpec = specOf(spec.x)
    const ySpec = specOf(spec.y)
    if (!xSpec || !ySpec) return []
    const xSamples = getDailySamples(xSpec).slice(-(windowSize + spec.lag))
    const ySamples = getDailySamples(ySpec).slice(-windowSize)
    const xs: number[] = []
    const ys: number[] = []
    for (let index = 0; index < ySamples.length; index += 1) {
      const xSample = xSamples[index]
      const ySample = ySamples[index]
      if (!xSample || !ySample) continue
      xs.push(xSample.value)
      ys.push(ySample.value)
    }
    const coefficient = roundTo(pearson(xs, ys), 2)
    return [{
      id: spec.id,
      title: spec.title,
      xName: xSpec.name,
      yName: ySpec.name,
      xUnit: xSpec.unit,
      yUnit: ySpec.unit,
      coefficient,
      strength: correlationStrength(coefficient),
      description: spec.explain(coefficient),
      points: xs.map((x, index) => ({ x: roundTo(x, 2), y: roundTo(ys[index], 2) })),
    }]
  })
}

function buildComparisons(metrics: HealthMetric[]): PeriodComparison[] {
  const ids = ['steps', 'activeEnergy', 'exerciseMinutes', 'sleepDuration', 'restingHeartRate', 'hrv', 'weight', 'bodyFat', 'water', 'mindfulMinutes', 'headphoneAudio', 'sodium', 'vo2Max', 'walkingSpeed']
  return ids
    .map((id) => metrics.find((metric) => metric.id === id))
    .filter((metric): metric is HealthMetric => Boolean(metric))
    .map((metric) => ({
      id: metric.id,
      name: metric.name,
      unit: metric.unit,
      decimals: metric.decimals,
      current: metric.current,
      previous: metric.previous,
      changePercent: metric.changePercent,
      trend: metric.trend,
      lowerIsBetter: metric.lowerIsBetter,
    }))
}

function buildRecommendations(breakdown: ScoreBreakdown[], anomalies: Anomaly[]) {
  const weakest = [...breakdown].sort((a, b) => a.score - b.score).slice(0, 2)
  const adviceByDimension: Record<string, string> = {
    cardio: '每周安排 2 次 20 分钟间歇跑 + 1 次 45 分钟轻松有氧，8 周后复测 VO₂max。',
    sleep: '把入睡时间固定在 23:30 前，睡前 60 分钟停止使用电子设备，并保证卧室温度 18–20 °C。',
    activity: '把日均步数目标拆成 3 段（通勤、午间、晚间），每段 2000–3000 步，避免长时间久坐。',
    body: '保持每周 0.3–0.5 公斤的减重节奏，蛋白质摄入提升到每公斤体重 1.6 克并配合抗阻训练。',
    mood: '每天固定 10 分钟正念呼吸，并在情绪记录中标注触发场景，便于回溯压力来源。',
    nutrition: '钠摄入控制在 2300 毫克以内，饮水提升到 2000 毫升，咖啡因不晚于 14:00。',
  }
  const recommendations = weakest.map((item) => adviceByDimension[item.id]).filter(Boolean)
  if (anomalies.some((item) => item.severity === 'critical')) {
    recommendations.push('出现血氧或体温的临界记录，建议本周内预约一次门诊复查，并携带健康 App 的趋势截图。')
  }
  recommendations.push('每 30 天在「健康」App 中检查一次数据源优先级，避免第三方设备重复写入造成步数翻倍。')
  return recommendations.slice(0, 5)
}

function buildAnalysis(range: HealthRange, metrics: HealthMetric[]): HealthAnalysis {
  const breakdown = computeScoreBreakdown()
  const anomalies = buildAnomalies()
  const days = rangeDays[range]
  const steps = windowAverage('steps', days)
  const sleep = windowAverage('sleepDuration', days)
  const resting = windowAverage('restingHeartRate', days)
  const exercise = windowAverage('exerciseMinutes', days)
  const score = Math.round(breakdown.reduce((total, item) => total + item.score, 0) / breakdown.length)
  const criticalCount = anomalies.filter((item) => item.severity === 'critical').length

  const recentEvents = getContexts()
    .slice(-90)
    .filter((ctx) => ctx.titles.length)
    .map((ctx) => ({ dateKey: ctx.dateKey, titles: ctx.titles }))
  const eventGroups = new Map<string, { date: string; titles: string[] }>()
  for (const item of recentEvents) {
    for (const title of item.titles) {
      const existing = eventGroups.get(title)
      if (existing) continue
      eventGroups.set(title, { date: item.dateKey, titles: [title] })
    }
  }

  return {
    rangeLabel: getRangeLabel(range),
    summary: `${getRangeLabel(range)}综合健康评分 ${score} 分，日均 ${Math.round(steps).toLocaleString('zh-CN')} 步、锻炼 ${Math.round(exercise)} 分钟、睡眠 ${sleep.toFixed(1)} 小时，静息心率 ${Math.round(resting)} 次/分。区间内共识别 ${anomalies.length} 条需要关注的记录${criticalCount ? `，其中 ${criticalCount} 条达到危急阈值` : ''}，整体趋势${resting <= 60 && sleep >= 7 ? '向好，恢复能力充足' : '平稳，仍有提升空间'}。`,
    recommendations: buildRecommendations(breakdown, anomalies),
    insights: buildInsights(metrics),
    anomalies,
    correlations: buildCorrelations(),
    comparisons: buildComparisons(metrics),
    events: [...eventGroups.entries()]
      .map(([title, item]) => {
        const event = healthEvents.find((candidate) => candidate.title === title)
        return { id: event?.id ?? title, title, date: item.date, days: event?.days ?? 1, detail: event?.detail ?? '' }
      })
      .sort((a, b) => (a.date < b.date ? 1 : -1)),
  }
}

/* ------------------------------------------------------------------ *
 * MSW handlers
 * ------------------------------------------------------------------ */

function ok<T>(data: T) {
  return HttpResponse.json({ code: 200, success: true, message: '操作成功', data })
}

function readRange(url: URL): HealthRange {
  const value = url.searchParams.get('range')
  return value === 'day' || value === 'week' || value === 'month' || value === 'sixMonths' || value === 'year' ? value : 'month'
}

export const HealthHandlers = [
  http.get('/health/overview', async ({ request }) => {
    await delay(160)
    const range = readRange(new URL(request.url))
    const metrics = buildMetrics(range)
    return ok(buildOverview(range, metrics))
  }),
  http.get('/health/metrics', async ({ request }) => {
    await delay(220)
    const range = readRange(new URL(request.url))
    return ok(buildMetrics(range))
  }),
  http.get('/health/workouts', async ({ request }) => {
    await delay(180)
    const range = readRange(new URL(request.url))
    return ok(buildWorkoutSummary(range))
  }),
  http.get('/health/records', async () => {
    await delay(120)
    return ok(buildRecords())
  }),
  http.get('/health/analysis', async ({ request }) => {
    await delay(240)
    const range = readRange(new URL(request.url))
    return ok(buildAnalysis(range, buildMetrics(range)))
  }),
]
