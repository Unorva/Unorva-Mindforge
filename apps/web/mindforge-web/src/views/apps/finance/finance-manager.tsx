import { useState, type SubmitEvent } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/components/ui/toast';
import { formatMoney } from './format';

const today = () => new Date().toLocaleDateString('sv-SE');
type Editor =
  | { kind: 'account'; value: Partial<Account> }
  | { kind: 'transaction'; value: Partial<Transaction> }
  | { kind: 'budget'; value: Partial<BudgetItem> };
type DeleteTarget = { kind: Editor['kind']; id: number; name: string };

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
  const [editor, setEditor] = useState<Editor | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
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
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>资金管理</DialogTitle>
          </DialogHeader>
          <Tabs defaultValue="transactions">
            <TabsList>
              <TabsTrigger value="transactions">收支明细</TabsTrigger>
              <TabsTrigger value="accounts">账户</TabsTrigger>
              <TabsTrigger value="budgets">预算</TabsTrigger>
            </TabsList>
            <TabsContent value="transactions" className="space-y-3">
              <Button
                disabled={!accounts.length}
                onClick={() => {
                  setError('');
                  setEditor({
                    kind: 'transaction',
                    value: {
                      date: today(),
                      type: '支出',
                      accountId: accounts[0]?.id,
                      amount: 0,
                      category: '',
                      description: '',
                      source: '手动录入',
                    },
                  });
                }}
              >
                <Plus />
                新增收支
              </Button>
              {!accounts.length && (
                <p className="text-sm text-muted-foreground">请先创建一个账户。</p>
              )}
              {!transactions.length && (
                <p className="py-6 text-center text-sm text-muted-foreground">暂无收支记录</p>
              )}
              {transactions.map((item) => (
                <div className="flex items-center gap-3 rounded-lg border p-3" key={item.id}>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {item.category} · {item.type} {formatMoney(item.amount)}
                    </p>
                    <p className="mt-1 truncate text-xs text-muted-foreground">
                      {item.date} · {item.description}
                    </p>
                  </div>
                  <Button
                    aria-label="编辑收支"
                    size="icon-sm"
                    variant="ghost"
                    onClick={() => {
                      setError('');
                      setEditor({ kind: 'transaction', value: item });
                    }}
                  >
                    <Pencil />
                  </Button>
                  <Button
                    aria-label="删除收支"
                    size="icon-sm"
                    variant="ghost"
                    onClick={() => {
                      setError('');
                      setDeleteTarget({
                        kind: 'transaction',
                        id: item.id,
                        name: item.description || item.category,
                      });
                    }}
                  >
                    <Trash2 />
                  </Button>
                </div>
              ))}
            </TabsContent>
            <TabsContent value="accounts" className="space-y-3">
              <Button
                onClick={() => {
                  setError('');
                  setEditor({ kind: 'account', value: { name: '', type: '现金', balance: 0 } });
                }}
              >
                <Plus />
                新增账户
              </Button>
              {!accounts.length && (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  暂无账户，先添加一个账户开始记账。
                </p>
              )}
              {accounts.map((item) => (
                <div className="flex items-center gap-3 rounded-lg border p-3" key={item.id}>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{item.name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {item.type} · {formatMoney(item.balance)}
                    </p>
                  </div>
                  <Button
                    aria-label="编辑账户"
                    size="icon-sm"
                    variant="ghost"
                    onClick={() => {
                      setError('');
                      setEditor({ kind: 'account', value: item });
                    }}
                  >
                    <Pencil />
                  </Button>
                  <Button
                    aria-label="删除账户"
                    size="icon-sm"
                    variant="ghost"
                    onClick={() => {
                      setError('');
                      setDeleteTarget({ kind: 'account', id: item.id, name: item.name });
                    }}
                  >
                    <Trash2 />
                  </Button>
                </div>
              ))}
            </TabsContent>
            <TabsContent value="budgets" className="space-y-3">
              <Button
                onClick={() => {
                  setError('');
                  setEditor({
                    kind: 'budget',
                    value: { month: today().slice(0, 7), category: '', budget: 0 },
                  });
                }}
              >
                <Plus />
                新增预算
              </Button>
              {!budgets.length && (
                <p className="py-6 text-center text-sm text-muted-foreground">本月暂无预算</p>
              )}
              {budgets.map((item) => (
                <div
                  className="flex items-center gap-3 rounded-lg border p-3"
                  key={item.id ?? item.category}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{item.category}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {item.month || today().slice(0, 7)} · {formatMoney(item.spent)} /{' '}
                      {formatMoney(item.budget)}
                    </p>
                  </div>
                  <Button
                    aria-label="编辑预算"
                    size="icon-sm"
                    variant="ghost"
                    onClick={() => {
                      setError('');
                      setEditor({
                        kind: 'budget',
                        value: { ...item, month: item.month ?? today().slice(0, 7) },
                      });
                    }}
                  >
                    <Pencil />
                  </Button>
                  {item.id && (
                    <Button
                      aria-label="删除预算"
                      size="icon-sm"
                      variant="ghost"
                      onClick={() => {
                        setError('');
                        setDeleteTarget({ kind: 'budget', id: item.id!, name: item.category });
                      }}
                    >
                      <Trash2 />
                    </Button>
                  )}
                </div>
              ))}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
      <Dialog
        open={editor !== null}
        onOpenChange={(value) => {
          if (!value && !busy) setEditor(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editor?.value.id ? '编辑' : '新增'}
              {editor?.kind === 'account'
                ? '账户'
                : editor?.kind === 'transaction'
                  ? '收支'
                  : '预算'}
            </DialogTitle>
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
                      setEditor({ ...editor, value: { ...editor.value, name: event.target.value } })
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
                          value: { ...editor.value, type: event.target.value as TransactionType },
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
                              event.target.value === '' ? undefined : Number(event.target.value),
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
        <DialogContent>
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
    </>
  );
}
