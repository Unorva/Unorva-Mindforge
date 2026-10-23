import { createContext, useContext } from 'react';

export type MailSyncListener = () => Promise<void>;

export const MailContext = createContext<{
  unreadCount: number;
  syncing: boolean;
  synchronizeNow: () => Promise<void>;
  refreshUnreadCount: () => Promise<void>;
  subscribeToSync: (listener: MailSyncListener, isMutating: () => boolean) => () => void;
} | null>(null);

export function useMailContext() {
  const context = useContext(MailContext);
  if (!context) throw new Error('useMailContext must be used within MailProvider');
  return context;
}
