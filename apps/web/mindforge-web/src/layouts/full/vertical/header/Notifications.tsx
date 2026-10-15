import useSWR from 'swr';
import { Bell } from 'lucide-react';
import { Link } from 'react-router';
import { getMails } from '@/api/mail/mail';
import { getFetcher } from '@/api/global-fetcher';
import type { ApiResult } from '@/types/api';
import type { AccountSettingsData } from '@/types/apps/settings';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

export default function Notifications({ className }: { className?: string }) {
  const { data: settings } = useSWR<ApiResult<AccountSettingsData>>(
    '/api/data/settings/SettingsData',
    getFetcher,
  );
  const notificationsEnabled = settings?.data.notifications.inAppNotifications ?? true;
  const { data } = useSWR(notificationsEnabled ? 'header-mails' : null, () => getMails(), {
    refreshInterval: 60000,
  });
  const unread =
    data?.data.filter(
      (item) => item.unread && item.folder !== 'trash' && item.folder !== 'draft',
    ) ?? [];
  if (!notificationsEnabled) return null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            className={cn('relative rounded-full', className)}
            variant="ghost"
            size="icon"
            aria-label={`未读邮件 ${unread.length} 封`}
          />
        }
      >
        <Bell />
        {unread.length > 0 && (
          <span className="absolute right-1 top-1 size-2 rounded-full bg-primary" />
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel>未读邮件 {unread.length}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {unread.length ? (
          unread.slice(0, 5).map((item) => (
            <DropdownMenuItem key={item.id} render={<Link to="/apps/mail" />}>
              <span className="truncate">{item.subject}</span>
            </DropdownMenuItem>
          ))
        ) : (
          <p className="px-3 py-5 text-sm text-muted-foreground">暂无未读邮件</p>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem render={<Link to="/apps/mail" />}>查看邮件中心</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
