import { useCallback, useEffect, useRef, useState } from 'react';
import { syncMailAccount, type MailAccount } from '@/api/mail/mail';

const MAX_RETRY_DELAY = 30 * 60 * 1000;
type Schedule = { nextAt: number; failures: number };

/** One scheduler per signed-in workspace, independent of the mailbox route. */
export function useMailSync({
  accounts,
  enabled,
  automatic,
  interval,
  resetKey,
  isMutating,
  onSynchronized,
}: {
  accounts: MailAccount[];
  enabled: boolean;
  automatic: boolean;
  interval: number;
  resetKey: number;
  isMutating: () => boolean;
  onSynchronized: () => Promise<void>;
}) {
  const latest = useRef({ accounts, enabled, automatic, interval, isMutating, onSynchronized });
  const [syncing, setSyncing] = useState(false);
  const schedules = useRef(new Map<number, Schedule>());
  const inFlight = useRef(false);
  const completion = useRef<Promise<void>>(Promise.resolve());
  const generation = useRef(0);
  const configurationVersion = useRef(0);
  const trigger = useRef<(manual?: boolean) => Promise<void>>(async () => {});

  useEffect(() => {
    latest.current = { accounts, enabled, automatic, interval, isMutating, onSynchronized };
  }, [accounts, enabled, automatic, interval, isMutating, onSynchronized]);

  useEffect(() => {
    schedules.current.clear();
    configurationVersion.current++;
  }, [resetKey, interval]);

  useEffect(() => {
    const currentGeneration = ++generation.current;
    const active = () => generation.current === currentGeneration;
    const available = () =>
      active() && latest.current.enabled && !latest.current.isMutating() && navigator.onLine;

    const synchronize = async (manual = false) => {
      if (!available() || inFlight.current || (!manual && !latest.current.automatic)) return;
      const now = Date.now();
      const ids = new Set(latest.current.accounts.map((account) => account.id));
      for (const id of schedules.current.keys()) {
        if (!ids.has(id)) schedules.current.delete(id);
      }
      const targets = latest.current.accounts.filter(
        (account) =>
          account.enabled &&
          account.credentialConfigured &&
          (manual || (schedules.current.get(account.id)?.nextAt ?? 0) <= now),
      );
      if (!targets.length) return;
      inFlight.current = true;
      let finished!: () => void;
      completion.current = new Promise<void>((resolve) => {
        finished = resolve;
      });
      const version = configurationVersion.current;
      let attempted = false;
      let failure: unknown;
      try {
        for (const account of targets) {
          if (!available() || version !== configurationVersion.current) break;
          if (!manual && !latest.current.automatic) break;
          const current = latest.current.accounts.find((item) => item.id === account.id);
          if (!current?.enabled || !current.credentialConfigured) continue;
          attempted = true;
          try {
            await syncMailAccount(account.id, { silent: !manual });
            if (!active() || version !== configurationVersion.current) break;
            schedules.current.set(account.id, {
              nextAt: Date.now() + latest.current.interval,
              failures: 0,
            });
          } catch (error) {
            failure = error;
            if (!active() || version !== configurationVersion.current) break;
            const failures = (schedules.current.get(account.id)?.failures ?? 0) + 1;
            schedules.current.set(account.id, {
              nextAt: Date.now() + Math.min(2 * 60 * 1000 * 2 ** failures, MAX_RETRY_DELAY),
              failures,
            });
          }
        }
        // Also refresh account errors when every remote connection failed.
        if (attempted && active()) await latest.current.onSynchronized();
        if (manual && failure) throw failure;
      } finally {
        inFlight.current = false;
        finished();
      }
    };
    const tick = () => void synchronize().catch(() => undefined);
    let resumedAt = -Infinity;
    const resume = () => {
      // Respect the configured interval and failed-account backoff on resume.
      if (!navigator.onLine) return;
      if (Date.now() - resumedAt < 30000) return;
      resumedAt = Date.now();
      tick();
    };
    trigger.current = async (manual = false) => {
      if (!manual) return synchronize();
      if (active()) setSyncing(true);
      try {
        await completion.current;
        return await synchronize(true);
      } finally {
        if (active()) setSyncing(false);
      }
    };
    tick();
    const timer = window.setInterval(tick, 15000);
    window.addEventListener('online', resume);
    window.addEventListener('focus', resume);
    document.addEventListener('visibilitychange', resume);
    return () => {
      generation.current = currentGeneration + 1;
      window.clearInterval(timer);
      window.removeEventListener('online', resume);
      window.removeEventListener('focus', resume);
      document.removeEventListener('visibilitychange', resume);
    };
  }, []);

  useEffect(() => {
    if (enabled) void trigger.current().catch(() => undefined);
  }, [enabled, automatic, resetKey, interval, accounts]);

  const synchronizeNow = useCallback(() => trigger.current(true), []);
  return { synchronizeNow, syncing };
}
