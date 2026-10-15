import { getFetcher } from '@/api/global-fetcher';
import type { ApiResult } from '@/types/api';

export interface DashboardSummary {
  projectCount: number;
  activeProjectCount: number;
  requirementCount: number;
  openDefectCount: number;
  noteCount: number;
  blogCount: number;
  reviewCount: number;
  conversationCount: number;
  unreadMailCount: number;
  totalAssets: number;
  monthIncome: number;
  monthExpense: number;
  recentProjects: { id: number; name: string; status: string; updatedTime: string }[];
  recentReviews: { id: number; date: string; preview: string }[];
}
export const getDashboardSummary = (): Promise<ApiResult<DashboardSummary>> =>
  getFetcher('/dashboard/summary');
