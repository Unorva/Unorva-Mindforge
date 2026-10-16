import { useEffect } from 'react';
import useSWR from 'swr';
import { getFetcher } from '@/api/global-fetcher';
import { getCurrentUser } from '@/api/system/users/users';
import type { ApiResult } from '@/types/api';
import type { AccountSettingsData, BackgroundStyle } from '@/types/apps/settings';

/** 与账户设置共用 SWR 缓存，保存背景和修改个人资料后即时刷新。 */
export function useWorkspaceAppearance() {
  const { data: settings } = useSWR<ApiResult<AccountSettingsData>>(
    '/api/data/settings/SettingsData',
    getFetcher,
  );
  const { data: profile, mutate: refreshProfile } = useSWR('current-user-profile', getCurrentUser);

  useEffect(() => {
    const onProfileUpdated = () => void refreshProfile();
    window.addEventListener('mindforge-profile-updated', onProfileUpdated);
    return () => window.removeEventListener('mindforge-profile-updated', onProfileUpdated);
  }, [refreshProfile]);

  const savedBackground = settings?.data.appearance?.background;
  const background: BackgroundStyle =
    savedBackground === 'dots' || savedBackground === 'watermark' ? savedBackground : 'plain';

  return { background, watermarkName: profile?.data.nickname?.trim() ?? '' };
}
