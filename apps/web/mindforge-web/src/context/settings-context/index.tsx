import { createContext, useContext, useEffect, useState } from 'react';
import useSWR from 'swr';
import {
  deleteFetcher,
  getFetcher,
  postFetcher,
  putFetcher,
} from 'src/api/global-fetcher';
import type {
  AccountSettingsData,
  AiSettings,
  AppIntegration,
  NotificationSettings,
  SecuritySettings,
} from 'src/types/apps/settings';

/** MSW 模拟接口的统一响应结构 */
interface SettingsResponse {
  status: number;
  msg: string;
  data: AccountSettingsData;
}

export interface SettingsContextType {
  settings: AccountSettingsData | null;
  loading: boolean;
  error: unknown;
  saveAiSettings: (ai: AiSettings) => Promise<void>;
  saveApps: (apps: AppIntegration[]) => Promise<void>;
  bindEmail: (email: string, provider: string) => Promise<void>;
  verifyEmail: (id: number) => Promise<void>;
  setPrimaryEmail: (id: number) => Promise<void>;
  unbindEmail: (id: number) => Promise<void>;
  saveNotifications: (notifications: NotificationSettings) => Promise<void>;
  saveSecurity: (security: SecuritySettings) => Promise<void>;
}

export const SettingsContext = createContext<SettingsContextType>(
  {} as SettingsContextType
);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [settings, setSettings] = useState<AccountSettingsData | null>(null);

  const { data, isLoading, error, mutate } = useSWR(
    '/api/data/settings/SettingsData',
    getFetcher
  );

  useEffect(() => {
    if (data) {
      setSettings((data as SettingsResponse).data);
    }
  }, [data]);

  /**
   * 所有写操作共用同一个流程：请求成功后用响应中的最新数据刷新本地状态，
   * 失败时由 global-fetcher 统一弹出错误提示，异常继续向上抛给调用方。
   */
  const applyUpdate = async (request: Promise<unknown>) => {
    const result = (await mutate(request, { revalidate: false })) as SettingsResponse;
    setSettings(result.data);
  };

  const saveAiSettings = (ai: AiSettings) =>
    applyUpdate(putFetcher('/api/data/settings/ai', ai));

  const saveApps = (apps: AppIntegration[]) =>
    applyUpdate(putFetcher('/api/data/settings/apps', apps));

  const bindEmail = (email: string, provider: string) =>
    applyUpdate(postFetcher('/api/data/settings/emails/bind', { email, provider }));

  const verifyEmail = (id: number) =>
    applyUpdate(putFetcher('/api/data/settings/emails/verify', { id }));

  const setPrimaryEmail = (id: number) =>
    applyUpdate(putFetcher('/api/data/settings/emails/primary', { id }));

  const unbindEmail = (id: number) =>
    applyUpdate(deleteFetcher('/api/data/settings/emails/unbind', { id }));

  const saveNotifications = (notifications: NotificationSettings) =>
    applyUpdate(putFetcher('/api/data/settings/notifications', notifications));

  const saveSecurity = (security: SecuritySettings) =>
    applyUpdate(putFetcher('/api/data/settings/security', security));

  return (
    <SettingsContext.Provider
      value={{
        settings,
        loading: isLoading && !settings,
        error,
        saveAiSettings,
        saveApps,
        bindEmail,
        verifyEmail,
        setPrimaryEmail,
        unbindEmail,
        saveNotifications,
        saveSecurity,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};

/**
 * 读取账户设置数据与写操作方法，必须在 SettingsProvider 内使用。
 */
export const useSettings = () => {
  const context = useContext(SettingsContext);

  if (!context) {
    throw new Error('useSettings must be used within SettingsProvider');
  }

  return context;
};
