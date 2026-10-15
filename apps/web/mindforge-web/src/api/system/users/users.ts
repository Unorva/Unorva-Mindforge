import { getFetcher, putFetcher } from '@/api/global-fetcher';
import type { ApiResult } from '@/types/api';

export interface UserProfile {
  id: number;
  nickname: string;
  email: string;
  phone: string;
  avatar: string;
  version?: number;
}
export const getCurrentUser = (): Promise<ApiResult<UserProfile>> => getFetcher('/users/me');
export const updateCurrentUser = (profile: UserProfile): Promise<ApiResult<UserProfile>> =>
  putFetcher('/users/me', profile);
export const changePassword = (
  currentPassword: string,
  newPassword: string,
): Promise<ApiResult<void>> => putFetcher('/users/me/password', { currentPassword, newPassword });
