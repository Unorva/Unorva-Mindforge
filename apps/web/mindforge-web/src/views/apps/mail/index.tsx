import { useCallback, useEffect, useMemo, useRef, useState, type SubmitEvent } from 'react';
import {
  Archive,
  Copy,
  File,
  Inbox,
  Loader2,
  Mail,
  Pencil,
  RefreshCw,
  Reply,
  RotateCcw,
  Send,
  Settings2,
  Star,
  Trash2,
} from 'lucide-react';
import {
  deleteMail,
  getMailAccounts,
  getMailProviders,
  getMails,
  recoverMailSend,
  saveMail,
  sendMail,
  syncMailAccount,
  updateMail,
  type MailAccount,
  type MailFolder,
  type MailItem,
  type MailProvider,
} from '@/api/mail/mail';
import { AppPage, AppPageHeader } from '@/components/shared/app-workspace';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/toast';
import { useMailContext } from '@/context/mail-context/use-mail-context';
import { cn } from '@/lib/utils';
import AccountManager from './account-manager';
import MailSelect from './mail-select';
import { emailAddress, mailDate, mailError, sortMails } from './mail-utils';

const folders = [
  { id: 'inbox', label: '收件箱', icon: Inbox },
  { id: 'starred', label: '星标', icon: Star },
  { id: 'draft', label: '草稿箱', icon: File },
  { id: 'sending', label: '发送待确认', icon: Loader2 },
  { id: 'sent', label: '已发送', icon: Send },
  { id: 'archive', label: '本地归档', icon: Archive },
  { id: 'trash', label: '本地回收站', icon: Trash2 },
] as const;

type ComposeStatus = 'editable' | 'uncertain' | 'sending' | 'sent';

export default function MailApp() {
  const [mails, setMails] = useState<MailItem[]>([]);
  const [accounts, setAccounts] = useState<MailAccount[]>([]);
  const [providers, setProviders] = useState<MailProvider[]>([]);
  const [accountFilter, setAccountFilter] = useState('all');
  const [folder, setFolder] = useState<MailFolder | 'starred'>('inbox');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [accountManagerOpen, setAccountManagerOpen] = useState(false);
  const [draft, setDraft] = useState<Partial<MailItem> | null>(null);
  const [composeStatus, setComposeStatus] = useState<ComposeStatus>('editable');
  const [composeError, setComposeError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<MailItem | null>(null);
  const [recoverTarget, setRecoverTarget] = useState<MailItem | null>(null);
  const { subscribeToSync, refreshUnreadCount } = useMailContext();
  const mutationVersion = useRef(0);
  const operation = useRef(false);
  const recipientInput = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [mailResult, accountResult, providerResult] = await Promise.all([
        getMails(),
        getMailAccounts(),
        getMailProviders(),
      ]);
      setMails(sortMails(mailResult.data));
      setAccounts(accountResult.data);
      setProviders(providerResult.data);
      setError('');
      return mailResult.data;
    } catch (cause) {
      setError(mailError(cause, '邮件加载失败，请重试。'));
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    let active = true;
    const refresh = async () => {
      while (active) {
        if (operation.current) {
          await new Promise(resolve => window.setTimeout(resolve, 100));
          continue;
        }
        const version = mutationVersion.current;
        const [messages, accountResult] = await Promise.all([getMails(undefined, { silent: true }), getMailAccounts({ silent: true })]);
        if (!active) return;
        if (operation.current || version !== mutationVersion.current) continue;
        setMails(sortMails(messages.data));
        setAccounts(accountResult.data);
        return;
      }
    };
    const unsubscribe = subscribeToSync(refresh, () => operation.current);
    return () => { active = false; unsubscribe(); };
  }, [subscribeToSync]);

  const filter =
    accountFilter === 'all' || accounts.some((item) => String(item.id) === accountFilter)
      ? accountFilter
      : 'all';
  const enabledAccounts = accounts.filter(
    (account) => account.enabled && account.credentialConfigured,
  );
  const defaultAccount = enabledAccounts.find((account) => account.isDefault) ?? enabledAccounts[0];
  const filteredAccount = accounts.find((account) => String(account.id) === filter);
  const filteredMails = useMemo(
    () => mails.filter((item) => filter === 'all' || String(item.accountId) === filter),
    [mails, filter],
  );
  const visibleMails = useMemo(
    () =>
      filteredMails.filter(
        (item) =>
          (folder === 'starred'
            ? item.starred && item.folder !== 'trash'
            : item.folder === folder) &&
          `${item.sender} ${item.recipient} ${item.subject} ${item.body}`
            .toLowerCase()
            .includes(query.toLowerCase()),
      ),
    [filteredMails, folder, query],
  );
  const selected = visibleMails.find((item) => item.id === selectedId) ?? visibleMails[0];
  useEffect(() => {
    if (selected && selected.id !== selectedId) setSelectedId(selected.id);
  }, [selected, selectedId]);
  const locked = !!busy || loading;
  const composeLocked = locked || composeStatus !== 'editable';
  const draftIsBound =
    !!draft?.id && mails.some((mail) => mail.id === draft.id && mail.accountId !== null);

  const replaceMail = (mail: MailItem) => {
    setMails((items) => sortMails([mail, ...items.filter((item) => item.id !== mail.id)]));
  };

  const openComposer = (mail?: Partial<MailItem>) => {
    const account =
      filteredAccount?.enabled && filteredAccount.credentialConfigured
        ? filteredAccount
        : defaultAccount;
    setDraft({ recipient: '', subject: '', body: '', accountId: account?.id ?? null, ...mail });
    setComposeStatus('editable');
    setComposeError('');
  };

  const reply = (mail: MailItem) => {
    const account = enabledAccounts.find((item) => item.id === mail.accountId) ?? defaultAccount;
    const replyingToSelf = emailAddress(mail.sender).toLowerCase() === account?.email.toLowerCase();
    openComposer({
      accountId: account?.id ?? null,
      recipient: emailAddress(replyingToSelf ? mail.recipient : mail.sender),
      subject: /^re:/i.test(mail.subject) ? mail.subject : `Re: ${mail.subject}`.slice(0, 200),
      body: `\n\n--- 原邮件 ---\n发件人：${mail.sender}\n时间：${mailDate(mail.createdAt, true)}\n\n${mail.body}`.slice(
        0,
        200000,
      ),
    });
  };

  const apply = async (mail: MailItem, updates: Partial<MailItem>) => {
    if (operation.current || mail.folder === 'sending') return;
    mutationVersion.current++;
    operation.current = true;
    setBusy('update');
    try {
      replaceMail((await updateMail(mail.id, updates)).data);
      setError('');
    } catch (cause) {
      setError(mailError(cause, '邮件更新失败，请重试。'));
    } finally {
      operation.current = false;
      void refreshUnreadCount();
      setBusy('');
    }
  };

  const synchronize = async () => {
    const targets =
      filter === 'all'
        ? enabledAccounts
        : enabledAccounts.filter((account) => String(account.id) === filter);
    if (operation.current || !targets.length) return;
    mutationVersion.current++;
    operation.current = true;
    setBusy('sync');
    setError('');
    let count = 0;
    const failures: string[] = [];
    try {
      for (const account of targets) {
        try {
          count += (await syncMailAccount(account.id)).data.syncedCount;
        } catch (cause) {
          failures.push(`${account.email}：${mailError(cause, '同步失败')}`);
        }
      }
      const refreshed = await load();
      if (failures.length) {
        setError(
          `部分邮箱同步失败。${failures.join('；')}${refreshed === null ? '；列表刷新失败，请重试。' : ''}`,
        );
      }
      if (targets.length > failures.length) {
        toast.add({
          type: 'success',
          title: '收件箱同步完成',
          description: `已同步 ${targets.length - failures.length} 个邮箱，读取或更新 ${count} 封邮件。`,
        });
      }
    } finally {
      operation.current = false;
      void refreshUnreadCount();
      setBusy('');
    }
  };

  const persistDraft = async (deliver: boolean) => {
    if (!draft || !draft.subject?.trim() || operation.current || composeStatus !== 'editable')
      return;
    const account = enabledAccounts.find((item) => item.id === draft.accountId);
    if (deliver && (!account || !draft.recipient?.trim())) {
      setComposeError('请选择已启用的发件邮箱，并填写一个收件邮箱地址。');
      return;
    }
    if (deliver && !recipientInput.current?.reportValidity()) return;
    mutationVersion.current++;
    operation.current = true;
    setBusy(deliver ? 'send' : 'save');
    setComposeError('');
    let savedId: number | undefined;
    let sending = false;
    try {
      // Reuse a committed draft ID for delivery and retries after network failures.
      const saved = (
        await saveMail({
          ...draft,
          subject: draft.subject.trim(),
          folder: 'draft',
          sender: account?.email ?? '',
        })
      ).data;
      savedId = saved.id;
      replaceMail(saved);
      setDraft((current) => (current ? { ...current, id: saved.id } : current));
      if (!deliver || !account) {
        setDraft(null);
        setFolder('draft');
        setAccountFilter(saved.accountId ? String(saved.accountId) : 'all');
        setQuery('');
        setSelectedId(saved.id);
        toast.add({ type: 'success', title: '草稿已保存' });
        return;
      }
      sending = true;
      setComposeStatus('sending');
      const sent = (
        await sendMail({
          id: saved.id,
          accountId: account.id,
          recipient: draft.recipient!.trim(),
          subject: saved.subject,
          body: saved.body,
        })
      ).data;
      replaceMail(sent);
      setDraft(null);
      setComposeStatus('editable');
      setFolder('sent');
      setQuery('');
      setAccountFilter(String(account.id));
      setSelectedId(sent.id);
      toast.add({
        type: 'success',
        title: '邮件已发送',
        description: `已通过 ${account.email} 发出。`,
      });
    } catch (cause) {
      const message = mailError(cause, deliver ? '发送失败。' : '草稿保存失败。');
      if (sending && savedId) {
        setComposeStatus('uncertain');
        try {
          const currentMails = (await getMails()).data;
          setMails(sortMails(currentMails));
          const current = currentMails.find((item) => item.id === savedId);
          setComposeStatus(
            current?.folder === 'draft'
              ? 'editable'
              : current?.folder === 'sent'
                ? 'sent'
                : current?.folder === 'sending'
                  ? 'sending'
                  : 'uncertain',
          );
          setComposeError(
            `${message} 编辑内容已保留。${current?.folder === 'draft' ? '草稿可继续编辑或重试发送。' : current?.folder === 'sent' ? '服务器记录为已发送，请勿重复发送。' : '请先核对邮箱服务商的发件记录，暂时不能再次发送。'}`,
          );
        } catch {
          setComposeError(
            `${message} 编辑内容已保留。发送状态尚未确认，请刷新状态并核对邮箱服务商的发件记录，暂时不能再次发送。`,
          );
        }
      } else {
        setComposeError(`${message} 编辑内容已保留。`);
      }
    } finally {
      operation.current = false;
      void refreshUnreadCount();
      setBusy('');
    }
  };

  const refreshSendState = async () => {
    if (!draft?.id || operation.current) return;
    mutationVersion.current++;
    operation.current = true;
    setBusy('refresh-send');
    try {
      const result = (await getMails()).data;
      setMails(sortMails(result));
      const current = result.find((item) => item.id === draft.id);
      const status =
        current?.folder === 'draft'
          ? 'editable'
          : current?.folder === 'sent'
            ? 'sent'
            : current?.folder === 'sending'
              ? 'sending'
              : 'uncertain';
      setComposeStatus(status);
      setComposeError(
        status === 'editable'
          ? '服务器记录为草稿，编辑内容已保留，可继续发送。'
          : status === 'sent'
            ? '服务器记录为已发送，请勿重复发送。'
            : '发送结果尚未确认，请核对服务商发件记录。关闭此窗口后，可在“发送待确认”中核对并恢复。',
      );
    } catch (cause) {
      setComposeError(mailError(cause, '发送状态刷新失败，请重试。'));
    } finally {
      operation.current = false;
      void refreshUnreadCount();
      setBusy('');
    }
  };

  const saveDraft = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    void persistDraft(false);
  };

  const permanentlyDelete = async () => {
    if (!deleteTarget || operation.current) return;
    mutationVersion.current++;
    operation.current = true;
    setBusy('delete');
    try {
      await deleteMail(deleteTarget.id);
      setMails((items) => items.filter((item) => item.id !== deleteTarget.id));
      setDeleteTarget(null);
      setError('');
    } catch (cause) {
      setError(mailError(cause, '删除失败，请重试。'));
    } finally {
      operation.current = false;
      void refreshUnreadCount();
      setBusy('');
    }
  };

  const recover = async () => {
    if (!recoverTarget || operation.current) return;
    mutationVersion.current++;
    operation.current = true;
    setBusy('recover');
    try {
      const mail = (await recoverMailSend(recoverTarget.id)).data;
      replaceMail(mail);
      setRecoverTarget(null);
      setFolder('draft');
      setAccountFilter(mail.accountId ? String(mail.accountId) : 'all');
      setQuery('');
      setSelectedId(mail.id);
      setError('');
      toast.add({ type: 'success', title: '已恢复为草稿', description: '恢复操作不会发送邮件。' });
    } catch (cause) {
      setError(mailError(cause, '发送状态恢复失败，请重试。'));
    } finally {
      operation.current = false;
      void refreshUnreadCount();
      setBusy('');
    }
  };

  return (
    <AppPage className="gap-5 bg-transparent p-0">
      <AppPageHeader
        title="邮件中心"
        extra={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" disabled={locked} onClick={() => setAccountManagerOpen(true)}>
              <Settings2 />
              管理邮箱
            </Button>
            <Button disabled={locked} onClick={() => openComposer()}>
              <Pencil />
              写邮件
            </Button>
          </div>
        }
      />
      <p className="text-sm text-muted-foreground">
        连接邮箱后同步收件箱，通过所选邮箱真实发送邮件。收件邮件的已读和星标会同步到邮箱服务；归档、回收站和删除仅影响工作台本地缓存。
      </p>
      {error && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-destructive/30 p-3 text-sm text-destructive"
        >
          <span className="min-w-0 break-words">{error}</span>
          <Button disabled={locked} onClick={() => void load()} size="sm" variant="outline">
            刷新列表
          </Button>
        </div>
      )}
      {!loading && !error && !accounts.length && (
        <Empty className="border bg-card">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Mail />
            </EmptyMedia>
            <EmptyTitle>连接你的第一个邮箱</EmptyTitle>
            <EmptyDescription>
              支持 QQ、163、Gmail、Outlook 和自定义 IMAP / SMTP 邮箱。添加邮箱并测试连接后即可同步。
            </EmptyDescription>
          </EmptyHeader>
          <Button variant="outline" disabled={locked} onClick={() => setAccountManagerOpen(true)}>
            添加邮箱
          </Button>
        </Empty>
      )}
      <Card className="overflow-hidden py-0">
        <div className="flex flex-wrap items-center gap-3 border-b p-3">
          <div className="min-w-0 w-full sm:w-64">
            <MailSelect
              label="筛选邮箱"
              value={filter}
              options={[
                { value: 'all', label: '全部邮箱' },
                ...accounts.map((account) => ({
                  value: String(account.id),
                  label: `${account.displayName || account.email}${account.enabled ? '' : '（已停用）'}`,
                })),
              ]}
              onChange={(value) => {
                setAccountFilter(value);
                setSelectedId(null);
              }}
            />
          </div>
          {filteredAccount && (
            <span className="min-w-0 flex-1 break-all text-xs text-muted-foreground">
              {filteredAccount.email} · 最近同步 {mailDate(filteredAccount.lastSyncAt, true)}
            </span>
          )}
          <div className="ml-auto flex gap-2">
            <Button size="sm" variant="ghost" disabled={locked} onClick={() => void load()}>
              <RefreshCw />
              刷新
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={
                locked ||
                (filter === 'all'
                  ? !enabledAccounts.length
                  : !enabledAccounts.some((account) => String(account.id) === filter))
              }
              onClick={() => void synchronize()}
            >
              {busy === 'sync' ? <Loader2 className="animate-spin" /> : <RefreshCw />}
              {busy === 'sync' ? '同步中…' : filter === 'all' ? '同步全部邮箱' : '同步此邮箱'}
            </Button>
          </div>
        </div>
        <div className="flex flex-wrap gap-1 border-b p-3">
          {folders.map((item) => (
            <Button
              key={item.id}
              variant={folder === item.id ? 'secondary' : 'ghost'}
              onClick={() => {
                setFolder(item.id);
                setSelectedId(null);
              }}
            >
              <item.icon />
              {item.label}
              <span className="text-xs text-muted-foreground">
                {
                  filteredMails.filter((mail) =>
                    item.id === 'starred'
                      ? mail.starred && mail.folder !== 'trash'
                      : mail.folder === item.id,
                  ).length
                }
              </span>
            </Button>
          ))}
        </div>
        <div className="grid min-h-[560px] grid-cols-1 md:grid-cols-[minmax(240px,340px)_1fr]">
          <section className="border-b md:border-b-0 md:border-r" aria-label="邮件列表">
            <div className="p-3">
              <Input
                aria-label="搜索邮件"
                placeholder="搜索标题、地址或内容"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
            <ScrollArea className="h-[500px]">
              {loading ? (
                <p className="p-5 text-sm text-muted-foreground">正在加载邮件…</p>
              ) : !visibleMails.length ? (
                <p className="p-5 text-center text-sm text-muted-foreground">
                  当前文件夹暂无邮件
                  {folder === 'inbox' && accounts.length > 0 ? '，可同步邮箱收件箱。' : '。'}
                </p>
              ) : (
                visibleMails.map((mail) => (
                  <div
                    className={cn(
                      'flex items-start border-t p-3',
                      mail.id === selected?.id && 'bg-muted/50',
                    )}
                    key={mail.id}
                  >
                    <button
                      className="min-w-0 flex-1 text-left"
                      type="button"
                      onClick={() => {
                        setSelectedId(mail.id);
                        if (mail.unread && !locked && mail.folder !== 'sending')
                          void apply(mail, { unread: false });
                      }}
                    >
                      <p className={cn('truncate text-sm', mail.unread && 'font-semibold')}>
                        {mail.subject || '（无主题）'}
                      </p>
                      <p className="mt-1 truncate text-xs text-muted-foreground">
                        {['draft', 'sent', 'sending'].includes(mail.folder)
                          ? `收件人：${mail.recipient || '未填写'}`
                          : mail.sender || '工作台'}
                      </p>
                      <p className="mt-2 truncate text-xs text-muted-foreground">
                        {mail.body || '暂无正文'}
                      </p>
                      <div className="mt-2 flex min-w-0 items-center justify-between gap-2 text-[11px] text-muted-foreground">
                        <span className="truncate">
                          {accounts.find((account) => account.id === mail.accountId)?.displayName ||
                            accounts.find((account) => account.id === mail.accountId)?.email ||
                            '未关联邮箱'}
                        </span>
                        <span className="shrink-0">{mailDate(mail.createdAt)}</span>
                      </div>
                    </button>
                    <Button
                      aria-label={mail.starred ? '取消星标' : '添加星标'}
                      size="icon-sm"
                      variant="ghost"
                      disabled={locked || mail.folder === 'sending'}
                      onClick={() => void apply(mail, { starred: !mail.starred })}
                    >
                      <Star className={cn(mail.starred && 'fill-amber-400 text-amber-400')} />
                    </Button>
                  </div>
                ))
              )}
            </ScrollArea>
          </section>
          <section aria-label="邮件详情" className="min-w-0">
            {selected ? (
              <>
                <div className="flex flex-wrap items-center gap-2 border-b p-3">
                  {selected.folder === 'draft' && (
                    <Button
                      disabled={locked}
                      variant="outline"
                      size="sm"
                      onClick={() => openComposer(selected)}
                    >
                      <Pencil />
                      编辑 / 发送
                    </Button>
                  )}
                  {selected.folder !== 'draft' && selected.folder !== 'sending' && (
                    <Button
                      disabled={locked}
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        openComposer({
                          accountId: selected.accountId,
                          recipient: selected.recipient,
                          subject: selected.subject,
                          body: selected.body,
                        })
                      }
                    >
                      <Copy />
                      复制为新草稿
                    </Button>
                  )}
                  {selected.folder !== 'draft' && selected.folder !== 'sending' && (
                    <Button
                      disabled={locked}
                      variant="outline"
                      size="sm"
                      onClick={() => reply(selected)}
                    >
                      <Reply />
                      回复
                    </Button>
                  )}
                  {selected.folder === 'sending' ? (
                    <Button
                      disabled={locked}
                      variant="outline"
                      size="sm"
                      onClick={() => setRecoverTarget(selected)}
                    >
                      <RotateCcw />
                      核对后恢复草稿
                    </Button>
                  ) : (
                    <>
                      {selected.folder !== 'archive' &&
                        selected.folder !== 'trash' &&
                        selected.folder !== 'draft' && (
                          <Button
                            disabled={locked}
                            size="sm"
                            variant="ghost"
                            onClick={() => void apply(selected, { folder: 'archive' })}
                          >
                            <Archive />
                            本地归档
                          </Button>
                        )}
                      {(selected.folder === 'archive' || selected.folder === 'trash') && (
                        <Button
                          disabled={locked}
                          size="sm"
                          variant="ghost"
                          onClick={() => void apply(selected, { folder: 'inbox' })}
                        >
                          <RotateCcw />
                          恢复到收件箱
                        </Button>
                      )}
                      <Button
                        disabled={locked}
                        size="sm"
                        variant="ghost"
                        onClick={() => void apply(selected, { unread: !selected.unread })}
                      >
                        {selected.unread ? '标为已读' : '标为未读'}
                      </Button>
                      <Button
                        disabled={locked}
                        size="sm"
                        variant="ghost"
                        className="ml-auto text-destructive"
                        onClick={() =>
                          selected.folder === 'trash'
                            ? setDeleteTarget(selected)
                            : void apply(selected, { folder: 'trash' })
                        }
                      >
                        <Trash2 />
                        {selected.folder === 'trash' ? '删除本地缓存' : '移入本地回收站'}
                      </Button>
                    </>
                  )}
                </div>
                <CardContent className="space-y-5 p-6">
                  {selected.folder === 'sending' && (
                    <div
                      role="status"
                      className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-sm leading-6"
                    >
                      此邮件正在发送，或发送结果尚未确认。请先刷新列表并核对邮箱服务商的发件记录；暂时不能编辑、删除或重复发送。发送开始至少
                      5 分钟后，可在确认未发出时恢复草稿。
                    </div>
                  )}
                  <h2 className="break-words text-xl font-semibold">
                    {selected.subject || '（无主题）'}
                  </h2>
                  <div className="text-xs leading-6 text-muted-foreground">
                    <p className="break-all">发件人：{selected.sender || '未填写'}</p>
                    <p className="break-all">收件人：{selected.recipient || '未填写'}</p>
                    <p className="break-all">
                      所属邮箱：
                      {accounts.find((account) => account.id === selected.accountId)?.email ||
                        '未关联邮箱'}
                    </p>
                    <p>时间：{mailDate(selected.createdAt, true)}</p>
                    <Badge variant="outline">
                      {folders.find((item) => item.id === selected.folder)?.label}
                    </Badge>
                  </div>
                  <p className="whitespace-pre-wrap break-words text-sm leading-7">
                    {selected.body || '暂无正文'}
                  </p>
                </CardContent>
              </>
            ) : (
              <div className="flex min-h-64 flex-col items-center justify-center gap-3 text-sm text-muted-foreground">
                <Mail />
                选择一封邮件或写邮件
              </div>
            )}
          </section>
        </div>
      </Card>
      <AccountManager
        open={accountManagerOpen}
        onOpenChange={setAccountManagerOpen}
        accounts={accounts}
        providers={providers}
        onChanged={async () => {
          await load();
        }}
        externalBusy={locked}
      />
      <Dialog
        open={draft !== null}
        onOpenChange={(open) => {
          if (!open && !locked) setDraft(null);
        }}
      >
        <DialogContent
          className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl"
          showCloseButton={!locked}
        >
          <DialogHeader>
            <DialogTitle>{draft?.id ? '编辑邮件草稿' : '写邮件'}</DialogTitle>
            <DialogDescription>
              保存草稿不会发件；点击发送后将通过所选邮箱发送真实邮件。
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={saveDraft} noValidate className="space-y-4">
            <fieldset disabled={composeLocked} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="mail-from-account">发件邮箱</Label>
                <MailSelect
                  id="mail-from-account"
                  label="发件邮箱"
                  value={draft?.accountId ? String(draft.accountId) : 'none'}
                  disabled={composeLocked}
                  options={[
                    ...(!draftIsBound
                      ? [{ value: 'none', label: '暂不关联邮箱（仅保存草稿）' }]
                      : []),
                    ...accounts.map((account) => ({
                      value: String(account.id),
                      label: `${account.displayName ? `${account.displayName} · ` : ''}${account.email}${!account.enabled ? '（已停用）' : !account.credentialConfigured ? '（未配置凭据）' : ''}`,
                    })),
                  ]}
                  onChange={(value) => {
                    setDraft({ ...draft, accountId: value === 'none' ? null : Number(value) });
                    setComposeError('');
                  }}
                />
                {!enabledAccounts.length && (
                  <p className="text-xs text-muted-foreground">
                    先在“管理邮箱”添加已启用的邮箱和授权凭据，即可发送。当前仍可保存草稿。
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="recipient">收件邮箱</Label>
                <Input
                  ref={recipientInput}
                  id="recipient"
                  type="email"
                  required
                  maxLength={254}
                  placeholder="recipient@example.com（一次发送给一个地址）"
                  value={draft?.recipient ?? ''}
                  onChange={(event) => setDraft({ ...draft, recipient: event.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="subject">主题</Label>
                <Input
                  id="subject"
                  required
                  maxLength={200}
                  value={draft?.subject ?? ''}
                  onChange={(event) => setDraft({ ...draft, subject: event.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="body">正文</Label>
                <Textarea
                  id="body"
                  rows={10}
                  maxLength={200000}
                  value={draft?.body ?? ''}
                  onChange={(event) => setDraft({ ...draft, body: event.target.value })}
                />
              </div>
            </fieldset>
            {composeError && (
              <p role="alert" className="rounded-lg bg-muted p-3 text-sm leading-6">
                {composeError}
              </p>
            )}
            <DialogFooter className="flex-wrap">
              <Button
                type="button"
                disabled={locked}
                variant="outline"
                onClick={() => setDraft(null)}
              >
                关闭
              </Button>
              {composeStatus !== 'editable' ? (
                <Button
                  type="button"
                  disabled={locked}
                  variant="outline"
                  onClick={() => void refreshSendState()}
                >
                  <RefreshCw />
                  刷新发送状态
                </Button>
              ) : (
                <>
                  <Button
                    disabled={composeLocked || !draft?.subject?.trim()}
                    variant="outline"
                    type="submit"
                  >
                    {busy === 'save' ? <Loader2 className="animate-spin" /> : <File />}
                    {busy === 'save' ? '保存中…' : '保存草稿'}
                  </Button>
                  <Button
                    disabled={
                      composeLocked ||
                      !draft?.subject?.trim() ||
                      !draft.recipient?.trim() ||
                      !enabledAccounts.some((account) => account.id === draft.accountId)
                    }
                    type="button"
                    onClick={() => void persistDraft(true)}
                  >
                    {busy === 'send' ? <Loader2 className="animate-spin" /> : <Send />}
                    {busy === 'send' ? '发送中…' : '发送邮件'}
                  </Button>
                </>
              )}
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open && !locked) setDeleteTarget(null);
        }}
      >
        <DialogContent showCloseButton={!locked}>
          <DialogHeader>
            <DialogTitle>删除本地邮件缓存</DialogTitle>
            <DialogDescription>
              “{deleteTarget?.subject}”将在工作台中永久删除。邮箱服务商中的原始邮件不会被删除。
            </DialogDescription>
          </DialogHeader>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button disabled={locked} variant="outline" onClick={() => setDeleteTarget(null)}>
              取消
            </Button>
            <Button
              disabled={locked}
              variant="destructive"
              onClick={() => void permanentlyDelete()}
            >
              {busy === 'delete' ? '删除中…' : '确认删除本地缓存'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={recoverTarget !== null}
        onOpenChange={(open) => {
          if (!open && !locked) setRecoverTarget(null);
        }}
      >
        <DialogContent showCloseButton={!locked}>
          <DialogHeader>
            <DialogTitle>核对发送结果</DialogTitle>
            <DialogDescription>
              请先到邮箱服务商检查“{recoverTarget?.subject}
              ”是否已经发出。只有确认未发出，且发送开始至少 5
              分钟后，才可恢复草稿。如果已经发出，请保留当前记录，避免再次发送。
            </DialogDescription>
          </DialogHeader>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button disabled={locked} variant="outline" onClick={() => setRecoverTarget(null)}>
              取消
            </Button>
            <Button disabled={locked} onClick={() => void recover()}>
              {busy === 'recover' ? '恢复中…' : '已核对未发出，恢复草稿'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppPage>
  );
}
