import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import useSWR from 'swr';
import { getFetcher } from '@/api/global-fetcher';
import { getMailAccounts, getMailUnreadCount, type MailAccount } from '@/api/mail/mail';
import type { ApiResult } from '@/types/api';
import type { AccountSettingsData } from '@/types/apps/settings';
import { MailContext, type MailSyncListener } from './use-mail-context';
import { useMailSync } from './use-mail-sync';
import { startMailEventStream } from './mail-event-stream';
import { clearAccessToken, getAccessToken } from '@/utils/auth';

export default function MailProvider({ children }: { children: ReactNode }) {
  const { data: settings } = useSWR<ApiResult<AccountSettingsData>>(
    '/api/data/settings/SettingsData',
    getFetcher,
  );
  const mailSettings = settings?.data.apps.find((app) => app.id === 'mail');
  const enabled = !!settings && (mailSettings?.enabled ?? true);
  const frequency = mailSettings?.options.syncFrequency ?? '实时';
  const interval =
    frequency === '每小时'
      ? 60 * 60 * 1000
      : frequency === '每天'
        ? 24 * 60 * 60 * 1000
        : 15 * 1000;
  const [accounts, setAccounts] = useState<MailAccount[]>([]);
  const [unread, setUnread] = useState(0);
  const [resetKey, setResetKey] = useState(0);
  const [liveConnected, setLiveConnected] = useState(false);
  const generation = useRef(0);
  const countRequest = useRef(0);
  const accountRequest = useRef(0);
  const listeners = useRef(new Map<MailSyncListener, () => boolean>());
  const isMutating = useCallback(
    () => [...listeners.current.values()].some((check) => check()),
    [],
  );
  const refreshUnreadCount = useCallback(async () => {
    const request = ++countRequest.current;
    const currentGeneration = generation.current;
    try {
      const result = await getMailUnreadCount({ silent: true });
      if (
        generation.current === currentGeneration &&
        request === countRequest.current &&
        !isMutating()
      ) {
        setUnread(result.data);
      }
    } catch {
      // Keep the last successful badge during transient network failures.
    }
  }, [isMutating]);
  const refreshAccounts = useCallback(async () => {
    const request = ++accountRequest.current;
    const currentGeneration = generation.current;
    try {
      const result = await getMailAccounts({ silent: true });
      if (generation.current === currentGeneration && request === accountRequest.current) {
        setAccounts(result.data);
      }
    } catch {
      // A later foreground refresh retries without interrupting the current page.
    }
  }, []);
  const subscribeToSync = useCallback((listener: MailSyncListener, check: () => boolean) => {
    listeners.current.set(listener, check);
    return () => {
      listeners.current.delete(listener);
    };
  }, []);
  const onSynchronized = useCallback(async () => {
    await Promise.allSettled([
      refreshAccounts(),
      ...[...listeners.current.keys()].map((listener) => listener()),
    ]);
    // A foreground flag change may have delayed the list refresh; count it afterwards.
    await refreshUnreadCount();
  }, [refreshAccounts, refreshUnreadCount]);

  useEffect(() => {
    const token = getAccessToken();
    if (!enabled || !token) return;
    let active = true;
    let refreshing = false;
    let pending = false;
    let revision: number | undefined;
    const refresh = async () => {
      pending = true;
      if (refreshing) return;
      refreshing = true;
      try {
        while (active && pending) {
          pending = false;
          await onSynchronized();
        }
      } finally {
        refreshing = false;
      }
    };
    const stop = startMailEventStream({
      url: `${(import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '')}/mail/events`,
      token,
      onMessage: (message) => {
        if (!active) return;
        // Invalidate older count requests before accepting the server snapshot.
        countRequest.current++;
        if (!isMutating()) setUnread(message.unreadCount);
        if (message.revision !== revision) {
          revision = message.revision;
          void refresh();
        }
      },
      onConnectionChange: (connected) => {
        if (active) setLiveConnected(connected);
      },
      onUnauthorized: () => clearAccessToken(),
    });
    return () => {
      active = false;
      stop();
      setLiveConnected(false);
    };
  }, [enabled, isMutating, onSynchronized]);

  useEffect(() => {
    const currentGeneration = ++generation.current;
    if (!enabled) return;
    let lastRefreshAt = -Infinity;
    const refresh = () => {
      if (!navigator.onLine) return;
      if (Date.now() - lastRefreshAt < 5000) return;
      lastRefreshAt = Date.now();
      void refreshUnreadCount();
      void refreshAccounts();
    };
    const accountsChanged = () => {
      void refreshAccounts().then(() => {
        if (generation.current === currentGeneration) setResetKey((key) => key + 1);
      });
      void refreshUnreadCount();
    };
    const mailChanged = () => {
      void refreshUnreadCount();
    };
    refresh();
    const timer = window.setInterval(refresh, 60000);
    window.addEventListener('online', refresh);
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    window.addEventListener('mindforge:mail-accounts-changed', accountsChanged);
    window.addEventListener('mindforge:mail-changed', mailChanged);
    return () => {
      generation.current = currentGeneration + 1;
      window.clearInterval(timer);
      window.removeEventListener('online', refresh);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
      window.removeEventListener('mindforge:mail-accounts-changed', accountsChanged);
      window.removeEventListener('mindforge:mail-changed', mailChanged);
    };
  }, [enabled, refreshAccounts, refreshUnreadCount]);

  const { synchronizeNow, syncing } = useMailSync({
    accounts,
    enabled,
    // The server owns remote polling while the authenticated push stream is healthy.
    automatic: frequency !== '手动' && !liveConnected,
    interval,
    resetKey,
    isMutating,
    onSynchronized,
  });

  return (
    <MailContext.Provider
      value={{
        unreadCount: enabled ? unread : 0,
        refreshUnreadCount,
        synchronizeNow,
        syncing,
        subscribeToSync,
      }}
    >
      {children}
    </MailContext.Provider>
  );
}
