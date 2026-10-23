import React from 'react';
import useSWR from 'swr';
import { getFetcher } from '@/api/global-fetcher';
import type { ApiResult } from '@/types/api';
import type { AccountSettingsData } from '@/types/apps/settings';
import { useMailContext } from '@/context/mail-context/use-mail-context';
import NavCollapse from './nav-collapse';
import SimpleBar from 'simplebar-react';
import FullLogo from '../../shared/logo/FullLogo';

import { Sidebar, SidebarContent, SidebarGroup, SidebarHeader } from 'src/components/ui/sidebar';
import { Badge } from 'src/components/ui/badge';
import sidebaritems, { type ChildItem } from './sidebaritems';

const appRoutes: Record<string, string> = {
  projects: '/apps/projects',
  mail: '/apps/mail',
  'daily-review': '/apps/daily-review',
  notes: '/apps/notes',
  blog: '/apps/blog',
};

const SidebarLayout = ({ ...props }: React.ComponentProps<typeof Sidebar>) => {
  const { unreadCount } = useMailContext();
  const { data } = useSWR<ApiResult<AccountSettingsData>>(
    '/api/data/settings/SettingsData',
    getFetcher,
  );
  const disabledRoutes = (data?.data.apps ?? [])
    .filter((app) => !app.enabled && appRoutes[app.id])
    .map((app) => appRoutes[app.id]);
  const filterItems = (items: ChildItem[]): ChildItem[] =>
    items.flatMap((item) => {
      if (item.url && disabledRoutes.some((route) => item.url!.startsWith(route))) return [];
      if (!item.items) {
        if (item.url !== appRoutes.mail) return [item];
        return [
          {
            ...item,
            badge: unreadCount > 0,
            badgeType: 'filled',
            badgeContent: unreadCount > 99 ? '99+' : String(unreadCount),
            badgeLabel: `${unreadCount} 封未读邮件`,
          },
        ];
      }
      const children = filterItems(item.items);
      return children.length ? [{ ...item, items: children }] : [];
    });
  const menu = sidebaritems.flatMap((section) => {
    if (!section.items) return [section];
    const items = filterItems(section.items);
    return items.length ? [{ ...section, items }] : [];
  });
  return (
    <Sidebar
      variant="inset"
      collapsible="icon"
      {...props}
      className="sidebar-box **:data-[slot=sidebar-inner]:bg-background **:data-[slot=sidebar-inner]:border **:data-[slot=sidebar-inner]:border-border group-data-[state=collapsed]:hover:shadow-xl"
      side="left"
    >
      <SidebarHeader className="p-3 group-data-[state=collapsed]:px-2.5 flex flex-row items-center justify-between border-b border-border">
        <FullLogo />
        <Badge className="group-data-[state=collapsed]:hidden" variant={'secondary'}>
          V.1.0
        </Badge>
      </SidebarHeader>

      <SidebarContent>
        <SimpleBar style={{ height: '100%' }}>
          <SidebarGroup className="flex items-center justify-center group-data-[state=collapsed]:px-2 px-3 py-4">
            <div className="px-0 group-data-[state=collapsed]:px-0 w-full flex flex-col gap-4">
              <NavCollapse menu={menu} className="text-sm" />
            </div>
          </SidebarGroup>
        </SimpleBar>
      </SidebarContent>
    </Sidebar>
  );
};

export default SidebarLayout;
