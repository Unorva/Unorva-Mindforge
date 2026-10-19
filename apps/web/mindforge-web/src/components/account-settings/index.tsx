import type { ReactNode } from 'react';
import AiSettings from './ai-settings';
import MailSettings from './mail-settings';
import { Bot, Mail } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SettingsProvider, useSettings } from '@/context/settings-context';
import Spinner from 'src/views/spinner/Spinner';

const SETTINGS_TABS = [
  { value: 'ai', label: 'AI 配置', icon: Bot },
  { value: 'mail', label: '邮箱', icon: Mail },
];

function AccountSettingsTabs({
  initialTab,
  children,
}: {
  initialTab?: 'ai' | 'mail';
  children?: ReactNode;
}) {
  return (
    <Tabs
      defaultValue={initialTab ?? 'ai'}
      orientation="vertical"
      className="grid min-h-0 grid-cols-[3.5rem_minmax(0,1fr)] gap-0 overflow-hidden sm:grid-cols-[10rem_minmax(0,1fr)] md:grid-cols-[11rem_minmax(0,1fr)]"
    >
      <TabsList className="h-auto! w-full shrink-0 flex-col! items-stretch! justify-start! gap-1 overflow-y-auto rounded-none border-r bg-muted/30 p-2">
        {SETTINGS_TABS.map(({ value, label, icon: TabIcon }) => (
          <TabsTrigger
            key={value}
            aria-label={label}
            value={value}
            className="h-10! w-full! flex-none justify-center gap-0 rounded-lg px-0 py-2 after:hidden hover:bg-muted/60 data-active:bg-muted data-active:shadow-none sm:justify-start sm:gap-2 sm:px-3"
          >
            <TabIcon />
            <span className="sr-only sm:not-sr-only">{label}</span>
          </TabsTrigger>
        ))}
      </TabsList>
      {children}
      <TabsContent
        value="mail"
        className="m-0 min-h-0 min-w-0 flex-1 overflow-y-auto p-4 pr-10 sm:p-6 sm:pr-12"
      >
        <MailSettings />
      </TabsContent>
    </Tabs>
  );
}

function AccountSettingsContent({ initialTab = 'ai' }: { initialTab?: 'ai' | 'mail' }) {
  const { settings, loading, error } = useSettings();

  if (error) {
    return (
      <AccountSettingsTabs initialTab={initialTab}>
        <TabsContent value="ai" className="m-0 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3 px-6 text-center">
            <p className="font-medium">账户设置加载失败</p>
            <p className="max-w-md text-sm text-muted-foreground">
              请重新打开设置；如果问题持续，请检查后端服务是否正常启动。
            </p>
          </div>
        </TabsContent>
      </AccountSettingsTabs>
    );
  }

  if (loading || !settings) {
    return (
      <AccountSettingsTabs initialTab={initialTab}>
        <TabsContent value="ai" className="m-0 flex items-center justify-center">
          <Spinner />
        </TabsContent>
      </AccountSettingsTabs>
    );
  }

  return (
    <AccountSettingsTabs initialTab={initialTab}>
      <AiSettings />
    </AccountSettingsTabs>
  );
}

interface AccountSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialTab?: 'ai' | 'mail';
}

/**
 * 账户设置弹窗：由顶部头像菜单中的 Account Settings 打开，
 * 自带 SettingsProvider，读写后端保存的个人账户设置。
 */
const AccountSettingsDialog = ({ open, onOpenChange, initialTab }: AccountSettingsDialogProps) => {
  if (!open) return null;

  return (
    <SettingsProvider>
      <Dialog open onOpenChange={onOpenChange}>
        <DialogContent
          className="grid-rows-1 gap-0 overflow-hidden p-0 h-[min(46rem,calc(100dvh-2rem))]"
          style={{
            width: 'calc(100vw - 2rem)',
            maxWidth: '70rem',
          }}
        >
          <DialogTitle className="sr-only">账户设置</DialogTitle>
          <DialogDescription className="sr-only">管理 AI 接口与邮箱账户。</DialogDescription>
          <AccountSettingsContent initialTab={initialTab} />
        </DialogContent>
      </Dialog>
    </SettingsProvider>
  );
};

export default AccountSettingsDialog;
