import { ApiResult } from '@/types/api.ts';
import {
  getFetcher,
  putFetcher,
  deleteFetcher,
} from '@/api/global-fetcher.ts';
import { DailyReviewUpdateParams } from 'src/types/apps/daily-review';

/**
 * 获取指定日期复盘笔记
 */
export function getDailyReview(date: string) {
  return getFetcher(
    '/daily-reviews', { date },
  ) as Promise<ApiResult<string>>;
}

/**
 * 更新指定日期复盘笔记
 */
export function updateDailyReview(params: DailyReviewUpdateParams) {
  return putFetcher(
    '/daily-reviews', params,
  ) as Promise<ApiResult<void>>;
}

/**
 * 获取指定月份有复盘笔记的日期
 */
export function getDailyReviewCalendar(month: string) {
  return getFetcher(
    '/daily-reviews/calendar', { month },
  ) as Promise<ApiResult<string[]>>;
}

/**
 * 删除指定日期复盘笔记
 */
export function deleteDailyReview(date: string) {
  return deleteFetcher(`/daily-reviews/${date}`) as Promise<ApiResult<void>>;
}
