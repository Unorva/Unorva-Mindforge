import { useRef, useState, type ReactNode, type SubmitEvent } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Pencil,
  Plus,
  ReceiptText,
  Target,
  Trash2,
  Wallet,
} from 'lucide-react';
import {
  deleteAccount,
  deleteBudget,
  deleteTransaction,
  saveAccount,
  saveBudget,
  saveTransaction,
  type Account,
  type AccountType,
  type BudgetItem,
  type Transaction,
  type TransactionType,
} from '@/api/finance/finance';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/components/ui/toast';
import { cn } from '@/lib/utils';
import { formatMoney } from './format';

const today = () => new Date().toLocaleDateString('sv-SE');
type Editor =
  | { kind: 'account'; value: Partial<Account> }
  | { kind: 'transaction'; value: Partial<Transaction> }
  | { kind: 'budget'; value: Partial<BudgetItem> };
type DeleteTarget = { kind: Editor['kind']; id: number; name: string };
type FinanceTab = 'transactions' | 'accounts' | 'budgets';

function ManagerEmpty({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  action: ReactNode;
}) {
  return (
    <Empty className="min-h-64 border bg-muted/20 py-10">
      <EmptyHeader>
        <EmptyMedia
          variant="icon"
          className="size-12 rounded-xl border bg-background [&_svg]:size-6"
        >
          {icon}
        </EmptyMedia>
        <EmptyTitle className="text-base">{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>{action}</EmptyContent>
    </Empty>
  );
}

function RecordActions({
  name,
  onEdit,
  onDelete,
}: {
  name: string;
  onEdit: () => void;
  onDelete?: () => void;
}) {
  return (
    <div className="flex shrink-0 items-center gap-1">
      <Button
        aria-label={`编辑${name}`}
        title={`编辑${name}`}
        size="icon-sm"
        variant="ghost"
        onClick={onEdit}
      >
        <Pencil />
      </Button>
      {onDelete && (
        <Button
          aria-label={`删除${name}`}
          title={`删除${name}`}
          className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          size="icon-sm"
          variant="ghost"
          onClick={onDelete}
        >
          <Trash2 />
        </Button>
      )}
    </div>
  );
}

export default function FinanceManager({
  accounts,
  budgets,
  transactions,
  onChanged,
}: {
  accounts: Account[];
  budgets: BudgetItem[];
  transactions: Transaction[];
  onChanged: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const managerRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<FinanceTab>('transactions');
  const [editor, setEditor] = useState<Editor | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const createAccount = () => {
    setError('');
    setEditor({ kind: 'account', value: { name: '', type: '现金', balance: 0 } });
  };
  const createTransaction = () => {
    setError('');
    setEditor({
      kind: 'transaction',
      value: {
        date: today(),
        type: '支出',
        accountId: accounts[0]?.id,
        amount: undefined,
        category: '',
        description: '',
        source: '手动录入',
      },
    });
  };
  const createBudget = () => {
    setError('');
    setEditor({
      kind: 'budget',
      value: { month: today().slice(0, 7), category: '', budget: undefined },
    });
  };
  const amountValid = (value: number | undefined, positive = false, allowNegative = false) =>
    value !== undefined &&
    Number.isFinite(value) &&
    (allowNegative || (positive ? value > 0 : value >= 0)) &&
    Math.abs(value) <= 9999999999.99 &&
    Math.abs(value * 100 - Math.round(value * 100)) < 0.00001;

  const save = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editor || busy) return;
    setError('');
    const { kind, value } = editor;
    if (kind === 'account' && (!value.name?.trim() || !amountValid(value.balance, false, true))) {
      setError('账户名称不能为空，余额必须为有效金额且最多两位小数。');
      return;
    }
    if (
      kind === 'transaction' &&
      (!value.category?.trim() ||
        !value.date ||
        !accounts.some((account) => account.id === value.accountId) ||
        !amountValid(value.amount, true))
    ) {
      setError('请选择账户、日期与分类，金额必须大于 0 且最多两位小数。');
      return;
    }
    if (
      kind === 'budget' &&
      (!value.category?.trim() ||
        !/^\d{4}-\d{2}$/.test(value.month ?? '') ||
        !amountValid(value.budget, true))
    ) {
      setError('请填写月份、分类和大于 0 的预算金额。');
      return;
    }
    setBusy(true);
    try {
      if (kind === 'account')
        await saveAccount({
          id: value.id,
          name: value.name!.trim(),
          type: value.type ?? '现金',
          balance: value.balance!,
        });
      else if (kind === 'transaction')
        await saveTransaction({
          id: value.id,
          date: value.date!,
          type: value.type ?? '支出',
          category: value.category!.trim(),
          description: value.description ?? '',
          accountId: value.accountId!,
          amount: value.amount!,
          source: value.source ?? '手动录入',
        });
      else
        await saveBudget({
          month: value.month!,
          category: value.category!.trim(),
          budget: value.budget!,
        });
      await onChanged();
      if (kind === 'account') setActiveTab('accounts');
      setEditor(null);
      toast.add({ type: 'success', title: '资金记录已保存' });
    } catch {
      setError('保存失败，输入内容已保留。');
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!deleteTarget || busy) return;
    setBusy(true);
    try {
      if (deleteTarget.kind === 'account') await deleteAccount(deleteTarget.id);
      else if (deleteTarget.kind === 'transaction') await deleteTransaction(deleteTarget.id);
      else await deleteBudget(deleteTarget.id);
      await onChanged();
      setDeleteTarget(null);
      toast.add({ type: 'success', title: '记录已删除' });
    } catch {
      setError('删除失败。有交易记录的账户不能删除。');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Pencil />
        管理账户与收支
      </Button>
      <Dialog
        open={open}
        onOpenChange={(value) => {
          if (!busy) setOpen(value);
        }}
      >
        <DialogContent
          ref={managerRef}
          className="flex max-h-[85dvh] flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl"
        >
          <DialogHeader className="shrink-0 border-b p-5 pr-12 sm:p-6 sm:pr-12">
            <div className="flex items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Wallet className="size-5" />
              </div>
              <div className="space-y-1.5">
                <DialogTitle className="text-lg font-semibold">资金管理</DialogTitle>
                <DialogDescription>管理账户、记录收支，让每一笔资金都有迹可循。</DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <Tabs
            value={activeTab}
            onValueChange={(value) => setActiveTab(value as FinanceTab)}
            className="min-h-0 gap-0"
          >
            <div className="shrink-0 px-5 pt-4 sm:px-6">
              <TabsList aria-label="资金管理分区" className="h-10! w-full">
                <TabsTrigger value="transactions" className="gap-2">
                  <ReceiptText className="hidden sm:block" />
                  收支明细
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {transactions.length}
                  </span>
                </TabsTrigger>
                <TabsTrigger value="accounts" className="gap-2">
                  <Wallet className="hidden sm:block" />
                  账户
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {accounts.length}
                  </span>
                </TabsTrigger>
                <TabsTrigger value="budgets" className="gap-2">
                  <Target className="hidden sm:block" />
                  预算
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {budgets.length}
                  </span>
                </TabsTrigger>
              </TabsList>
            </div>
            <div className="min-h-0 overflow-y-auto overscroll-contain p-5 sm:p-6">
              <TabsContent value="transactions" className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="space-y-1">
                    <h3 className="text-sm font-semibold">收支明细</h3>
                    <p className="text-xs text-muted-foreground">
                      集中查看和维护每一笔收入与支出。
                    </p>
                  </div>
                  {accounts.length > 0 && transactions.length > 0 && (
                    <Button onClick={createTransaction}>
                      <Plus />
                      新增收支
                    </Button>
                  )}
                </div>
                {!accounts.length ? (
                  <ManagerEmpty
                    icon={<Wallet />}
                    title="从第一个账户开始"
                    description="添加现金、储蓄或电子钱包账户，即可记录收入与支出。"
                    action={
                      <Button onClick={createAccount}>
                        <Plus />
                        创建账户
                      </Button>
                    }
                  />
                ) : !transactions.length ? (
                  <ManagerEmpty
                    icon={<ReceiptText />}
                    title="暂无收支记录"
                    description="账户已准备就绪，记下第一笔收支，开始了解资金动向。"
                    action={
                      <Button onClick={createTransaction}>
                        <Plus />
                        记录第一笔收支
                      </Button>
                    }
                  />
                ) : (
                  <div className="divide-y rounded-xl border">
                    {transactions.map((item) => (
                      <div className="flex items-center gap-3 p-3 sm:p-4" key={item.id}>
                        <div
                          className={cn(
                            'hidden size-9 shrink-0 items-center justify-center rounded-lg sm:flex',
                            item.type === '收入'
                              ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                              : 'bg-muted text-muted-foreground',
                          )}
                        >
                          {item.type === '收入' ? (
                            <ArrowDownLeft className="size-4" />
                          ) : (
                            <ArrowUpRight className="size-4" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1 space-y-1.5">
                          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
                            <div className="flex min-w-0 items-center gap-2">
                              <span className="truncate font-medium">{item.category}</span>
                              <Badge variant="secondary" className="shrink-0">
                                {item.type}
                              </Badge>
                            </div>
                            <span
                              className={cn(
                                'break-all font-semibold tabular-nums',
                                item.type === '收入'
                                  ? 'text-emerald-700 dark:text-emerald-400'
                                  : 'text-foreground',
                              )}
                            >
                              {item.type === '收入' ? '+' : '−'}
                              {formatMoney(item.amount)}
                            </span>
                          </div>
                          <p className="truncate text-xs text-muted-foreground">
                            {item.date} ·{' '}
                            {accounts.find((account) => account.id === item.accountId)?.name ??
                              '未知账户'}
                            {item.description && <> · {item.description}</>}
                          </p>
                        </div>
                        <RecordActions
                          name={['收支', item.description || item.category].join('：')}
                          onEdit={() => {
                            setError('');
                            setEditor({ kind: 'transaction', value: item });
                          }}
                          onDelete={() => {
                            setError('');
                            setDeleteTarget({
                              kind: 'transaction',
                              id: item.id,
                              name: item.description || item.category,
                            });
                          }}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
              <TabsContent value="accounts" className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="space-y-1">
                    <h3 className="text-sm font-semibold">我的账户</h3>
                    <p className="text-xs text-muted-foreground">
                      管理资金账户及余额，收支会自动计入对应账户。
                    </p>
                  </div>
                  {accounts.length > 0 && (
                    <Button onClick={createAccount}>
                      <Plus />
                      新增账户
                    </Button>
                  )}
                </div>
                {!accounts.length ? (
                  <ManagerEmpty
                    icon={<Wallet />}
                    title="还没有资金账户"
                    description="创建一个账户，归集你的现金、储蓄、投资或电子钱包。"
                    action={
                      <Button onClick={createAccount}>
                        <Plus />
                        创建账户
                      </Button>
                    }
                  />
                ) : (
                  <div className="divide-y rounded-xl border">
                    {accounts.map((item) => (
                      <div className="flex items-center gap-3 p-3 sm:p-4" key={item.id}>
                        <div className="hidden size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary sm:flex">
                          <Wallet className="size-4" />
                        </div>
                        <div className="min-w-0 flex-1 space-y-1.5">
                          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
                            <p className="min-w-0 truncate font-medium">{item.name}</p>
                            <p className="break-all font-semibold tabular-nums">
                              {formatMoney(item.balance)}
                            </p>
                          </div>
                          <p className="text-xs text-muted-foreground">{item.type}</p>
                        </div>
                        <RecordActions
                          name={['账户', item.name].join('：')}
                          onEdit={() => {
                            setError('');
                            setEditor({ kind: 'account', value: item });
                          }}
                          onDelete={() => {
                            setError('');
                            setDeleteTarget({ kind: 'account', id: item.id, name: item.name });
                          }}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
              <TabsContent value="budgets" className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="space-y-1">
                    <h3 className="text-sm font-semibold">本月预算</h3>
                    <p className="text-xs text-muted-foreground">
                      按分类设置支出上限，随时掌握预算使用情况。
                    </p>
                  </div>
                  {budgets.length > 0 && (
                    <Button onClick={createBudget}>
                      <Plus />
                      新增预算
                    </Button>
                  )}
                </div>
                {!budgets.length ? (
                  <ManagerEmpty
                    icon={<Target />}
                    title="本月还没有预算"
                    description="为日常支出设定一个目标，让消费更有计划。"
                    action={
                      <Button onClick={createBudget}>
                        <Plus />
                        设置本月预算
                      </Button>
                    }
                  />
                ) : (
                  <div className="divide-y rounded-xl border">
                    {budgets.map((item) => {
                      const percent =
                        item.budget > 0 ? Math.round((item.spent / item.budget) * 100) : 0;
                      const overBudget = item.spent > item.budget;
                      return (
                        <div
                          className="flex items-center gap-3 p-3 sm:p-4"
                          key={item.id ?? item.category}
                        >
                          <div className="hidden size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground sm:flex">
                            <Target className="size-4" />
                          </div>
                          <div className="min-w-0 flex-1 space-y-2">
                            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
                              <p className="min-w-0 truncate font-medium">{item.category}</p>
                              <span
                                className={cn(
                                  'text-xs tabular-nums',
                                  overBudget ? 'text-destructive' : 'text-muted-foreground',
                                )}
                              >
                                {overBudget ? '已超支' : '已使用'} {percent}%
                              </span>
                            </div>
                            <Progress
                              aria-label={[item.category, '预算已使用 ', percent, '%'].join('')}
                              value={Math.min(percent, 100)}
                              className={cn(
                                'gap-0 [&_[data-slot=progress-track]]:h-1.5',
                                overBudget && '[&_[data-slot=progress-indicator]]:bg-destructive',
                              )}
                            />
                            <p className="break-words text-xs tabular-nums text-muted-foreground">
                              {item.month || today().slice(0, 7)} · {formatMoney(item.spent)} /{' '}
                              {formatMoney(item.budget)}
                            </p>
                          </div>
                          <RecordActions
                            name={['预算', item.category].join('：')}
                            onEdit={() => {
                              setError('');
                              setEditor({
                                kind: 'budget',
                                value: { ...item, month: item.month ?? today().slice(0, 7) },
                              });
                            }}
                            onDelete={
                              item.id
                                ? () => {
                                    setError('');
                                    setDeleteTarget({
                                      kind: 'budget',
                                      id: item.id!,
                                      name: item.category,
                                    });
                                  }
                                : undefined
                            }
                          />
                        </div>
                      );
                    })}
                  </div>
                )}
              </TabsContent>
            </div>
          </Tabs>
          <Dialog
            open={editor !== null}
            onOpenChange={(value) => {
              if (!value && !busy) setEditor(null);
            }}
          >
            <DialogContent
              className="max-h-[85dvh] overflow-y-auto"
              initialFocus={() =>
                document.getElementById(
                  editor?.kind === 'account'
                    ? 'account-name'
                    : editor?.kind === 'transaction'
                      ? 'transaction-date'
                      : editor?.value.id
                        ? 'budget-amount'
                        : 'budget-month',
                )
              }
              finalFocus={managerRef}
            >
              <DialogHeader>
                <DialogTitle>
                  {editor?.value.id ? '编辑' : '新增'}
                  {editor?.kind === 'account'
                    ? '账户'
                    : editor?.kind === 'transaction'
                      ? '收支'
                      : '预算'}
                </DialogTitle>
                <DialogDescription>
                  {editor?.kind === 'account'
                    ? '设置账户名称、类型与余额，统一管理你的资金。'
                    : editor?.kind === 'transaction'
                      ? '选择资金账户，填写这笔收支的日期、分类与金额。'
                      : '按月份与分类设置预算，跟踪支出进度。'}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={save} className="space-y-4">
                {error && (
                  <p role="alert" className="text-sm text-destructive">
                    {error}
                  </p>
                )}
                {editor?.kind === 'account' && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="account-name">账户名称</Label>
                      <Input
                        id="account-name"
                        required
                        maxLength={100}
                        value={editor.value.name ?? ''}
                        onChange={(event) =>
                          setEditor({
                            ...editor,
                            value: { ...editor.value, name: event.target.value },
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="account-type">账户类型</Label>
                      <NativeSelect
                        id="account-type"
                        value={editor.value.type}
                        onChange={(event) =>
                          setEditor({
                            ...editor,
                            value: { ...editor.value, type: event.target.value as AccountType },
                          })
                        }
                      >
                        {['现金', '储蓄', '投资', '电子钱包'].map((item) => (
                          <NativeSelectOption value={item} key={item}>
                            {item}
                          </NativeSelectOption>
                        ))}
                      </NativeSelect>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="account-balance">
                        {editor.value.id ? '当前余额' : '初始余额'}
                      </Label>
                      <Input
                        id="account-balance"
                        required
                        type="number"
                        step="0.01"
                        max="9999999999.99"
                        value={editor.value.balance ?? ''}
                        onChange={(event) =>
                          setEditor({
                            ...editor,
                            value: {
                              ...editor.value,
                              balance:
                                event.target.value === '' ? undefined : Number(event.target.value),
                            },
                          })
                        }
                      />
                    </div>
                  </>
                )}
                {editor?.kind === 'transaction' && (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label htmlFor="transaction-date">日期</Label>
                        <Input
                          id="transaction-date"
                          required
                          type="date"
                          value={editor.value.date ?? ''}
                          onChange={(event) =>
                            setEditor({
                              ...editor,
                              value: { ...editor.value, date: event.target.value },
                            })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="transaction-type">类型</Label>
                        <NativeSelect
                          id="transaction-type"
                          value={editor.value.type}
                          onChange={(event) =>
                            setEditor({
                              ...editor,
                              value: {
                                ...editor.value,
                                type: event.target.value as TransactionType,
                              },
                            })
                          }
                        >
                          <NativeSelectOption value="收入">收入</NativeSelectOption>
                          <NativeSelectOption value="支出">支出</NativeSelectOption>
                        </NativeSelect>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="transaction-account">账户</Label>
                      <NativeSelect
                        id="transaction-account"
                        value={editor.value.accountId}
                        onChange={(event) =>
                          setEditor({
                            ...editor,
                            value: { ...editor.value, accountId: Number(event.target.value) },
                          })
                        }
                      >
                        {accounts.map((item) => (
                          <NativeSelectOption key={item.id} value={item.id}>
                            {item.name}
                          </NativeSelectOption>
                        ))}
                      </NativeSelect>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label htmlFor="transaction-category">分类</Label>
                        <Input
                          id="transaction-category"
                          required
                          maxLength={100}
                          value={editor.value.category ?? ''}
                          onChange={(event) =>
                            setEditor({
                              ...editor,
                              value: { ...editor.value, category: event.target.value },
                            })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="transaction-amount">金额</Label>
                        <Input
                          id="transaction-amount"
                          type="number"
                          required
                          min="0.01"
                          max="9999999999.99"
                          step="0.01"
                          value={editor.value.amount ?? ''}
                          onChange={(event) =>
                            setEditor({
                              ...editor,
                              value: {
                                ...editor.value,
                                amount:
                                  event.target.value === ''
                                    ? undefined
                                    : Number(event.target.value),
                              },
                            })
                          }
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="transaction-description">描述</Label>
                      <Input
                        id="transaction-description"
                        maxLength={500}
                        value={editor.value.description ?? ''}
                        onChange={(event) =>
                          setEditor({
                            ...editor,
                            value: { ...editor.value, description: event.target.value },
                          })
                        }
                      />
                    </div>
                  </>
                )}
                {editor?.kind === 'budget' && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="budget-month">月份</Label>
                      <Input
                        id="budget-month"
                        disabled={Boolean(editor.value.id)}
                        required
                        type="month"
                        value={editor.value.month ?? ''}
                        onChange={(event) =>
                          setEditor({
                            ...editor,
                            value: { ...editor.value, month: event.target.value },
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="budget-category">分类</Label>
                      <Input
                        id="budget-category"
                        disabled={Boolean(editor.value.id)}
                        required
                        maxLength={100}
                        value={editor.value.category ?? ''}
                        onChange={(event) =>
                          setEditor({
                            ...editor,
                            value: { ...editor.value, category: event.target.value },
                          })
                        }
                      />
                      <p className="text-xs text-muted-foreground">
                        {editor.value.id
                          ? '月份与分类不可修改；需要调整时新建预算。'
                          : '同一月份与分类再次保存会更新预算。'}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="budget-amount">预算金额</Label>
                      <Input
                        id="budget-amount"
                        required
                        type="number"
                        min="0.01"
                        max="9999999999.99"
                        step="0.01"
                        value={editor.value.budget ?? ''}
                        onChange={(event) =>
                          setEditor({
                            ...editor,
                            value: {
                              ...editor.value,
                              budget:
                                event.target.value === '' ? undefined : Number(event.target.value),
                            },
                          })
                        }
                      />
                    </div>
                  </>
                )}
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={busy}
                    onClick={() => setEditor(null)}
                  >
                    取消
                  </Button>
                  <Button type="submit" disabled={busy}>
                    {busy ? '保存中…' : '保存'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
          <Dialog
            open={deleteTarget !== null}
            onOpenChange={(value) => {
              if (!value && !busy) setDeleteTarget(null);
            }}
          >
            <DialogContent finalFocus={managerRef}>
              <DialogHeader>
                <DialogTitle>删除资金记录</DialogTitle>
              </DialogHeader>
              <p className="text-sm text-muted-foreground">
                确认删除“{deleteTarget?.name}”？删除收支后会重新计算账户余额。
              </p>
              {error && (
                <p role="alert" className="text-sm text-destructive">
                  {error}
                </p>
              )}
              <DialogFooter>
                <Button disabled={busy} variant="outline" onClick={() => setDeleteTarget(null)}>
                  取消
                </Button>
                <Button disabled={busy} variant="destructive" onClick={() => void remove()}>
                  {busy ? '删除中…' : '确认删除'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </DialogContent>
      </Dialog>
    </>
  );
}
