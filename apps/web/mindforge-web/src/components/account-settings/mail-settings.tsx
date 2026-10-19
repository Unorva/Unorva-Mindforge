import useSWR from 'swr';
import { Loader2, RefreshCw } from 'lucide-react';
import { getMailAccounts, getMailProviders } from '@/api/mail/mail';
import { Button } from '@/components/ui/button';
import AccountManager from '@/views/apps/mail/account-manager';

export default function MailSettings() {
  const accounts = useSWR('/mail/accounts', () => getMailAccounts(), {
    revalidateOnFocus: false,
    shouldRetryOnError: false,
  });
  const providers = useSWR('/mail/providers', () => getMailProviders(), {
    revalidateOnFocus: false,
    shouldRetryOnError: false,
  });
  const loading = accounts.isValidating || providers.isValidating;
  const ready = !!accounts.data && !!providers.data;

  const refreshAccounts = async () => {
    try {
      await accounts.mutate();
    } finally {
      // 保存操作已生效时，即使设置列表刷新失败，也通知邮件中心重新取数。
      window.dispatchEvent(new Event('mindforge:mail-accounts-changed'));
    }
  };

  const refresh = async () => {
    await Promise.all([refreshAccounts(), providers.mutate()]);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-medium">邮箱</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            添加和管理邮件中心使用的邮箱账户，测试连接或更新授权凭据。
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          disabled={loading}
          onClick={() => void refresh().catch(() => undefined)}
        >
          {loading ? <Loader2 className="animate-spin" /> : <RefreshCw />}
          刷新
        </Button>
      </div>
      <AccountManager
        embedded
        open
        onOpenChange={() => undefined}
        accounts={accounts.data?.data ?? []}
        providers={providers.data?.data ?? []}
        onChanged={refreshAccounts}
        externalBusy={loading || !ready}
      />
    </div>
  );
}
