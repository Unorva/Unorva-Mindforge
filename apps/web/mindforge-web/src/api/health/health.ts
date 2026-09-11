import { getFetcher } from '@/api/global-fetcher'
import type { ApiResult } from '@/types/api'
import type {
  HealthAnalysis,
  HealthMetric,
  HealthOverview,
  HealthRange,
  HealthRecord,
  WorkoutSummary,
} from '@/types/apps/health'

/**
 * 健康管理接口，当前由 src/api/health/health-data.ts 中的 MSW 模拟数据提供，
 * 后端实现同名接口后可直接切换（同时在 vite.config.ts 中补充代理）。
 */

/** 概览：健康评分、活动圆环、目标完成度与数据来源 */
export function getHealthOverview(range: HealthRange) {
  return getFetcher('/health/overview', { range }) as Promise<ApiResult<HealthOverview>>
}

/** 全部分类的指标序列 */
export function getHealthMetrics(range: HealthRange) {
  return getFetcher('/health/metrics', { range }) as Promise<ApiResult<HealthMetric[]>>
}

/** 体能训练记录与训练负荷 */
export function getHealthWorkouts(range: HealthRange) {
  return getFetcher('/health/workouts', { range }) as Promise<ApiResult<WorkoutSummary>>
}

/** 实验室化验与症状等非时序记录 */
export function getHealthRecords() {
  return getFetcher('/health/records') as Promise<ApiResult<HealthRecord[]>>
}

/** 分析结果：洞察、异常、相关性与周期对比 */
export function getHealthAnalysis(range: HealthRange) {
  return getFetcher('/health/analysis', { range }) as Promise<ApiResult<HealthAnalysis>>
}
