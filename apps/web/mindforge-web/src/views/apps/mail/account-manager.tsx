import { useRef, useState, type ReactNode, type SubmitEvent } from 'react';
import { ExternalLink, Loader2, Pencil, Plus, ShieldCheck, Trash2 } from 'lucide-react';
import {
  deleteMailAccount,
  saveMailAccount,
  testMailAccount,
  type MailAccount,
  type MailAccountInput,
  type MailAuthType,
  type MailProvider,
  type MailSecurity,
} from '@/api/mail/mail';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/components/ui/toast';
import { cn } from '@/lib/utils';
import MailSelect from './mail-select';
import { mailDate } from './mail-utils';

const securityOptions = [
  { value: 'ssl', label: 'SSL / TLS' },
  { value: 'starttls', label: 'STARTTLS' },
];

function newAccount(provider?: MailProvider): MailAccountInput {
  return {
    provider: provider?.id ?? 'custom',
    email: '',
    displayName: '',
    username: '',
    password: '',
    authType: provider?.authType ?? 'password',
    imapHost: provider?.imapHost ?? '',
    imapPort: provider?.imapPort ?? 993,
    imapSecurity: provider?.imapSecurity ?? 'ssl',
    smtpHost: provider?.smtpHost ?? '',
    smtpPort: provider?.smtpPort ?? 465,
    smtpSecurity: provider?.smtpSecurity ?? 'ssl',
    enabled: true,
    isDefault: false,
  };
}

function AccountManagerSurface({
  embedded,
  open,
  locked,
  onOpenChange,
  children,
}: {
  embedded: boolean;
  open: boolean;
  locked: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
}) {
  if (embedded) return <div className="space-y-4">{children}</div>;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl"
        showCloseButton={!locked}
      >
        <DialogHeader>
          <DialogTitle>管理邮箱</DialogTitle>
          <DialogDescription>连接常用邮箱，在一个收件箱查看和处理邮件。</DialogDescription>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}

export default function AccountManager({
  open,
  onOpenChange,
  accounts,
  providers,
  onChanged,
  externalBusy = false,
  embedded = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accounts: MailAccount[];
  providers: MailProvider[];
  onChanged: () => Promise<void>;
  externalBusy?: boolean;
  embedded?: boolean;
}) {
  const [editing, setEditing] = useState<MailAccountInput | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MailAccount | null>(null);
  const [busy, setBusy] = useState('');
  const operation = useRef(false);
  const provider = providers.find((item) => item.id === editing?.provider);
  const original = accounts.find((account) => account.id === editing?.id);
  const locked = !!busy || externalBusy;

  const update = (updates: Partial<MailAccountInput>) => {
    setEditing((current) => (current ? { ...current, ...updates } : current));
  };

  const save = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editing || operation.current || externalBusy) return;
    operation.current = true;
    setBusy('save');
    try {
      await saveMailAccount({
        ...editing,
        email: editing.email.trim(),
        displayName: editing.displayName.trim(),
        username: editing.username.trim() || editing.email.trim(),
        password: editing.password || undefined,
        imapHost: editing.imapHost.trim(),
        smtpHost: editing.smtpHost.trim(),
      });
      setEditing(null);
      toast.add({
        type: 'success',
        title: '邮箱配置已保存',
        description: '可测试连接后同步邮件。',
      });
      await onChanged();
    } catch {
      // global-fetcher reports request failures once through the shared toast.
    } finally {
      operation.current = false;
      setBusy('');
    }
  };

  const test = async (account: MailAccount) => {
    if (operation.current || externalBusy) return;
    operation.current = true;
    setBusy(`test-${account.id}`);
    try {
      const result = await testMailAccount(account.id);
      toast.add({
        type: result.data.success ? 'success' : 'error',
        title: result.data.success ? '邮箱连接正常' : '邮箱连接失败',
        description: result.data.message,
      });
    } catch {
      // Transport failures are already reported by global-fetcher.
    } finally {
      try {
        await onChanged();
      } catch {
        // Refresh failures use the same global request feedback.
      } finally {
        operation.current = false;
        setBusy('');
      }
    }
  };

  const remove = async () => {
    if (!deleteTarget || operation.current || externalBusy) return;
    operation.current = true;
    setBusy('delete');
    try {
      await deleteMailAccount(deleteTarget.id);
      setDeleteTarget(null);
      toast.add({ type: 'success', title: '邮箱已移除' });
      await onChanged();
    } catch {
      // Keep the confirmation open; the request error is shown in a toast.
    } finally {
      operation.current = false;
      setBusy('');
    }
  };

  const providerOptions = providers.map((item) => ({ value: item.id, label: item.name }));
  if (!providerOptions.some((item) => item.value === 'custom')) {
    providerOptions.push({ value: 'custom', label: '其他邮箱 / 自定义' });
  }
  if (editing && !providerOptions.some((item) => item.value === editing.provider)) {
    providerOptions.push({ value: editing.provider, label: editing.provider });
  }
  const Footer = embedded ? 'div' : DialogFooter;

  return (
    <>
      <AccountManagerSurface
        embedded={embedded}
        open={open}
        locked={locked}
        onOpenChange={(next) => {
          if (!locked && !editing && !deleteTarget) {
            onOpenChange(next);
          }
        }}
      >
        <div className="space-y-3">
          {accounts.map((account) => (
            <div key={account.id} className="rounded-lg border p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="break-all font-medium">{account.displayName || account.email}</p>
                    {account.isDefault && <Badge variant="secondary">默认发件</Badge>}
                    {!account.enabled && <Badge variant="outline">已停用</Badge>}
                  </div>
                  <p className="break-all text-xs text-muted-foreground">{account.email}</p>
                  <p className="text-xs text-muted-foreground">
                    {providers.find((item) => item.id === account.provider)?.name ??
                      account.provider}
                    {' · '}最近同步：{mailDate(account.lastSyncAt, true)}
                  </p>
                </div>
                <Badge variant={account.status === 'error' ? 'destructive' : 'outline'}>
                  <span
                    className={cn(
                      'size-1.5 rounded-full',
                      account.status === 'connected'
                        ? 'bg-emerald-500'
                        : account.status === 'error'
                          ? 'bg-destructive'
                          : 'bg-muted-foreground',
                    )}
                  />
                  {account.status === 'connected'
                    ? '已连接'
                    : account.status === 'error'
                      ? '连接异常'
                      : '待测试'}
                </Badge>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={locked}
                  onClick={() => void test(account)}
                >
                  {busy === `test-${account.id}` ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    <ShieldCheck />
                  )}
                  {busy === `test-${account.id}` ? '测试中…' : '测试连接'}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={locked}
                  onClick={() => {
                    setEditing({
                      id: account.id,
                      provider: account.provider,
                      email: account.email,
                      displayName: account.displayName,
                      username: account.username,
                      authType: account.authType,
                      imapHost: account.imapHost,
                      imapPort: account.imapPort,
                      imapSecurity: account.imapSecurity,
                      smtpHost: account.smtpHost,
                      smtpPort: account.smtpPort,
                      smtpSecurity: account.smtpSecurity,
                      enabled: account.enabled,
                      isDefault: account.isDefault,
                      password: '',
                    });
                  }}
                >
                  <Pencil />
                  编辑
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="ml-auto text-destructive"
                  disabled={locked}
                  onClick={() => {
                    setDeleteTarget(account);
                  }}
                >
                  <Trash2 />
                  移除
                </Button>
              </div>
            </div>
          ))}
        </div>
        <Footer className={embedded ? 'flex justify-end gap-2' : undefined}>
          {!embedded && (
            <Button variant="outline" disabled={locked} onClick={() => onOpenChange(false)}>
              关闭
            </Button>
          )}
          <Button
            disabled={locked}
            onClick={() => {
              setEditing(newAccount(providers[0]));
            }}
          >
            <Plus />
            添加邮箱
          </Button>
        </Footer>
      </AccountManagerSurface>
      <Dialog
        open={editing !== null}
        onOpenChange={(next) => {
          if (!next && !locked) {
            setEditing(null);
          }
        }}
      >
        <DialogContent
          className="max-h-[90dvh] overflow-y-auto sm:max-w-xl"
          showCloseButton={!locked}
        >
          <DialogHeader>
            <DialogTitle>{editing?.id ? '编辑邮箱' : '添加邮箱'}</DialogTitle>
            <DialogDescription>选择邮箱服务，填写地址和授权凭据。</DialogDescription>
          </DialogHeader>
          <form onSubmit={save} className="space-y-4">
            <fieldset disabled={locked} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="mail-provider">邮箱服务</Label>
                <MailSelect
                  id="mail-provider"
                  label="邮箱服务"
                  value={editing?.provider ?? 'custom'}
                  options={providerOptions}
                  disabled={locked}
                  onChange={(value) => {
                    const preset = providers.find((item) => item.id === value);
                    update({
                      provider: value,
                      ...(preset
                        ? {
                            authType: preset.authType,
                            imapHost: preset.imapHost,
                            imapPort: preset.imapPort,
                            imapSecurity: preset.imapSecurity,
                            smtpHost: preset.smtpHost,
                            smtpPort: preset.smtpPort,
                            smtpSecurity: preset.smtpSecurity,
                          }
                        : {}),
                    });
                  }}
                />
              </div>
              {provider?.helpText && (
                <div className="rounded-lg bg-muted/60 p-3 text-xs leading-6 text-muted-foreground">
                  <p>{provider.helpText}</p>
                  {provider.helpUrl && /^https:\/\//i.test(provider.helpUrl) && (
                    <a
                      className="inline-flex items-center gap-1 text-primary underline underline-offset-4"
                      href={provider.helpUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      查看设置帮助
                      <ExternalLink className="size-3" />
                    </a>
                  )}
                </div>
              )}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="mail-account-email">邮箱地址</Label>
                  <Input
                    id="mail-account-email"
                    type="email"
                    autoComplete="email"
                    required
                    maxLength={200}
                    placeholder="you@example.com"
                    value={editing?.email ?? ''}
                    onChange={(event) => update({ email: event.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mail-account-name">显示名称</Label>
                  <Input
                    id="mail-account-name"
                    maxLength={100}
                    placeholder="例如：工作邮箱"
                    value={editing?.displayName ?? ''}
                    onChange={(event) => update({ displayName: event.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="mail-account-password">
                  {editing?.authType === 'oauth2' ? 'OAuth2 访问令牌' : '邮箱授权码 / 应用专用密码'}
                </Label>
                <Input
                  id="mail-account-password"
                  type="password"
                  autoComplete="new-password"
                  required={
                    !original?.credentialConfigured || editing?.authType !== original.authType
                  }
                  maxLength={16000}
                  placeholder={
                    original?.credentialConfigured && editing?.authType === original.authType
                      ? '留空以保留现有凭据'
                      : editing?.authType === 'oauth2'
                        ? '粘贴访问令牌'
                        : '请输入邮箱生成的授权码'
                  }
                  value={editing?.password ?? ''}
                  onChange={(event) => update({ password: event.target.value })}
                />
                <p className="text-xs leading-5 text-muted-foreground">
                  {editing?.authType === 'oauth2'
                    ? '需要从你自己的邮箱服务应用取得令牌；令牌过期后需在此更新，暂不支持一键授权或自动刷新。'
                    : '在邮箱设置中开启 IMAP / SMTP，并生成授权码或应用专用密码。请按邮箱服务的说明填写。'}
                </p>
              </div>
              <details className="rounded-lg border p-3" open={editing?.provider === 'custom'}>
                <summary className="cursor-pointer text-sm font-medium">高级服务器设置</summary>
                <div className="mt-4 space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="mail-account-username">登录账号</Label>
                      <Input
                        id="mail-account-username"
                        maxLength={200}
                        autoComplete="username"
                        placeholder="默认使用邮箱地址"
                        value={editing?.username ?? ''}
                        onChange={(event) => update({ username: event.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="mail-auth">认证方式</Label>
                      <MailSelect
                        id="mail-auth"
                        label="认证方式"
                        value={editing?.authType ?? 'password'}
                        disabled={locked}
                        options={[
                          { value: 'password', label: '授权码 / 应用密码' },
                          { value: 'oauth2', label: 'OAuth2 访问令牌' },
                        ]}
                        onChange={(value) =>
                          update({ authType: value as MailAuthType, password: '' })
                        }
                      />
                    </div>
                  </div>
                  {(['imap', 'smtp'] as const).map((protocol) => (
                    <div
                      key={protocol}
                      className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_80px_120px]"
                    >
                      <div className="space-y-2">
                        <Label htmlFor={`mail-${protocol}-host`}>
                          {protocol.toUpperCase()} 服务器
                        </Label>
                        <Input
                          id={`mail-${protocol}-host`}
                          required
                          maxLength={255}
                          placeholder={`${protocol}.example.com`}
                          value={editing?.[`${protocol}Host`] ?? ''}
                          onChange={(event) => update({ [`${protocol}Host`]: event.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`mail-${protocol}-port`}>端口</Label>
                        <Input
                          id={`mail-${protocol}-port`}
                          type="number"
                          required
                          min={1}
                          max={65535}
                          value={editing?.[`${protocol}Port`] ?? ''}
                          onChange={(event) =>
                            update({ [`${protocol}Port`]: Number(event.target.value) })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`mail-${protocol}-security`}>加密</Label>
                        <MailSelect
                          id={`mail-${protocol}-security`}
                          label={`${protocol.toUpperCase()} 加密`}
                          value={editing?.[`${protocol}Security`] ?? 'ssl'}
                          disabled={locked}
                          options={securityOptions}
                          onChange={(value) =>
                            update({ [`${protocol}Security`]: value as MailSecurity })
                          }
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </details>
              <div className="flex flex-wrap gap-x-6 gap-y-3 rounded-lg bg-muted/50 p-3">
                <div className="flex items-center gap-2">
                  <Switch
                    id="mail-enabled"
                    checked={editing?.enabled ?? true}
                    onCheckedChange={(value) =>
                      update({ enabled: value, ...(!value ? { isDefault: false } : {}) })
                    }
                  />
                  <Label htmlFor="mail-enabled">启用此邮箱</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    id="mail-default"
                    checked={editing?.isDefault ?? false}
                    onCheckedChange={(value) =>
                      update({ isDefault: value, ...(value ? { enabled: true } : {}) })
                    }
                  />
                  <Label htmlFor="mail-default">默认发件邮箱</Label>
                </div>
              </div>
            </fieldset>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={locked}
                onClick={() => {
                  setEditing(null);
                }}
              >
                取消
              </Button>
              <Button type="submit" disabled={locked}>
                {busy === 'save' && <Loader2 className="animate-spin" />}
                {busy === 'save' ? '保存中…' : '保存邮箱'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(next) => {
          if (!next && !locked) {
            setDeleteTarget(null);
          }
        }}
      >
        <DialogContent showCloseButton={!locked}>
          <DialogHeader>
            <DialogTitle>移除邮箱</DialogTitle>
            <DialogDescription>
              移除 {deleteTarget?.email}{' '}
              及其在邮件中心的本地缓存；关联草稿也将删除。邮箱服务中的邮件不会被删除。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              disabled={locked}
              onClick={() => {
                setDeleteTarget(null);
              }}
            >
              取消
            </Button>
            <Button variant="destructive" disabled={locked} onClick={() => void remove()}>
              {busy === 'delete' && <Loader2 className="animate-spin" />}
              {busy === 'delete' ? '移除中…' : '确认移除'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
