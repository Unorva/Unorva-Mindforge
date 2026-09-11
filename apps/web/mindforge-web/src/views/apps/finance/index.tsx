import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { createColumnHelper } from '@tanstack/react-table'
import {
  ArrowDownRight,
  ArrowLeftRight,
  ArrowUpRight,
  Banknote,
  CreditCard,
  Landmark,
  PiggyBank,
  Receipt,
  RefreshCw,
  Smartphone,
  TrendingUp,
  Wallet,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import {
  getFinanceSummary,
  getFinanceTransactions,
  type Account,
  type AccountType,
  type BudgetItem,
  type FinanceSummary,
  type Transaction,
  type TransactionType,
} from '@/api/finance/finance'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { DataTable } from '@/components/data-table/data-table'
import { AppPage, AppPageDivider, AppPageHeader } from '@/components/shared/app-workspace'
import { DashboardCard } from '@/components/shared/dashboard-card'
import { cn } from '@/lib/utils'
import { CategoryBreakdown, IncomeExpenseTrend } from './charts'
import { formatDelta, formatMoney } from './format'

const accountIcons: Record<AccountType, LucideIcon> = {
  现金: Banknote,
  储蓄: Landmark,
  投资: TrendingUp,
  电子钱包: Smartphone,
}

function Pill({ children, className }: { children: ReactNode; className: string }) {
  return <span className={cn('inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium', className)}>{children}</span>
}

function typeClass(type: TransactionType) {
  return type === '收入'
    ? 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-400'
    : 'bg-red-500/12 text-red-700 dark:text-red-400'
}

function DeltaText({ positiveIsGood, suffix, value }: { positiveIsGood: boolean; suffix: string; value: number }) {
  const good = positiveIsGood ? value >= 0 : value < 0
  const Icon = value >= 0 ? ArrowUpRight : ArrowDownRight
  return (
    <span className="flex items-center gap-1 text-xs">
      <Icon className={cn('size-3.5', good ? 'text-chart-2' : 'text-destructive')} />
      <span className={cn('font-medium tabular-nums', good ? 'text-chart-2' : 'text-destructive')}>{formatDelta(value)}</span>
      <span className="text-muted-foreground">{suffix}</span>
    </span>
  )
}

function FinanceStatCard({ footer, icon: Icon, label, value }: { footer?: ReactNode; icon: LucideIcon; label: string; value: string }) {
  return (
    <DashboardCard className="col-span-12 py-6 md:col-span-6 xl:col-span-3">
      <CardContent className="px-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <p className="text-sm font-normal text-foreground">{label}</p>
            <h3 className="text-2xl font-semibold tabular-nums">{value}</h3>
            {footer && <div className="mt-1">{footer}</div>}
          </div>
          <div className="w-fit rounded-md border border-border p-2.5"><Icon size={16} /></div>
        </div>
      </CardContent>
    </DashboardCard>
  )
}

function AccountsPanel({ accounts }: { accounts: Account[] }) {
  return (
    <DashboardCard className="flex flex-col gap-0!">
      <CardHeader className="border-b border-border">
        <CardTitle className="flex items-center gap-2">
          <Wallet className="text-muted-foreground" size={16} />
          账户资产
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-2.5 p-5">
        {accounts.map((account) => {
          const Icon = accountIcons[account.type]
          return (
            <div className="flex items-center gap-3 rounded-lg border border-border/70 p-3" key={account.id}>
              <div className="grid size-9 shrink-0 place-items-center rounded-md bg-primary/10 text-primary"><Icon size={16} /></div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{account.name}</p>
                <p className="text-xs text-muted-foreground">{account.type}</p>
              </div>
              <p className="text-sm font-semibold tabular-nums">{formatMoney(account.balance)}</p>
            </div>
          )
        })}
      </CardContent>
    </DashboardCard>
  )
}

function BudgetPanel({ budgets }: { budgets: BudgetItem[] }) {
  return (
    <DashboardCard className="flex flex-col gap-0!">
      <CardHeader className="border-b border-border">
        <CardTitle className="flex items-center gap-2">
          <Receipt className="text-muted-foreground" size={16} />
          本月预算执行
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 p-5">
        {budgets.map((item) => {
          const percent = item.budget > 0 ? Math.round((item.spent / item.budget) * 100) : 0
          return (
            <div className="grid gap-1.5" key={item.category}>
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="font-medium">{item.category}</span>
                <span className="text-xs tabular-nums text-muted-foreground">{formatMoney(item.spent, 0)} / {formatMoney(item.budget, 0)} · {percent}%</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div className={cn('h-full rounded-full', percent >= 100 ? 'bg-destructive' : percent >= 80 ? 'bg-chart-4' : 'bg-primary')} style={{ width: `${Math.min(percent, 100)}%` }} />
              </div>
            </div>
          )
        })}
      </CardContent>
    </DashboardCard>
  )
}

export default function Finance() {
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState<FinanceSummary | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [summaryResult, transactionsResult] = await Promise.all([getFinanceSummary(), getFinanceTransactions()])
      if (summaryResult.success) setSummary(summaryResult.data)
      if (transactionsResult.success) setTransactions(transactionsResult.data)
    } catch {
      // 请求层已统一提示失败原因，这里只负责结束加载状态。
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const columns = useMemo(() => {
    const columnHelper = createColumnHelper<Transaction>()
    const accountName = (accountId: number) => summary?.accounts.find((account) => account.id === accountId)?.name ?? '未知账户'
    return [
      columnHelper.accessor('date', {
        header: '日期',
        cell: ({ getValue }) => <span className="tabular-nums text-muted-foreground">{getValue()}</span>,
      }),
      columnHelper.accessor('type', {
        header: '类型',
        cell: ({ getValue }) => <Pill className={typeClass(getValue())}>{getValue()}</Pill>,
      }),
      columnHelper.accessor('category', {
        header: '分类',
        cell: ({ getValue }) => <span className="font-medium">{getValue()}</span>,
      }),
      columnHelper.accessor('description', { header: '描述' }),
      columnHelper.accessor('accountId', {
        header: '账户',
        cell: ({ getValue }) => <span className="text-muted-foreground">{accountName(getValue())}</span>,
      }),
      columnHelper.accessor('source', {
        header: '来源',
        cell: ({ getValue }) => <span className="text-muted-foreground">{getValue()}</span>,
      }),
      columnHelper.accessor('amount', {
        header: '金额',
        cell: ({ row }) => (
          <span className={cn('font-semibold tabular-nums', row.original.type === '收入' ? 'text-chart-2' : 'text-destructive')}>
            {row.original.type === '收入' ? '+' : '-'}{formatMoney(row.original.amount)}
          </span>
        ),
      }),
    ]
  }, [summary])

  if (loading) {
    return <Empty className="min-h-72 border"><EmptyHeader><EmptyMedia variant="icon"><Wallet /></EmptyMedia><EmptyTitle>正在加载资金数据</EmptyTitle></EmptyHeader></Empty>
  }

  if (!summary) {
    return (
      <Empty className="min-h-72 border">
        <EmptyHeader><EmptyMedia variant="icon"><Wallet /></EmptyMedia><EmptyTitle>资金数据加载失败</EmptyTitle><EmptyDescription>请检查网络后重试；数据由手机端记录并同步生成。</EmptyDescription></EmptyHeader>
        <EmptyContent><Button onClick={() => void load()} variant="outline"><RefreshCw />重新加载</Button></EmptyContent>
      </Empty>
    )
  }

  return (
    <AppPage>
      <AppPageHeader
        extra={
          <span className="flex items-center gap-1.5 rounded-md border border-border bg-muted/40 px-2.5 py-1 text-xs text-muted-foreground">
            <Smartphone size={13} />
            手机端最近同步：{summary.lastSyncAt}
          </span>
        }
        title="资金管理"
      />
      <AppPageDivider />
      <Card className="min-h-[calc(100dvh-15rem)] gap-0! p-0">
        <section className="grid grid-cols-12 gap-px border-b bg-border">
          <FinanceStatCard
            footer={<Badge className="bg-primary/10! text-primary!">{summary.accounts.length} 个账户</Badge>}
            icon={Landmark}
            label="总资产"
            value={formatMoney(summary.totalAssets, 0)}
          />
          <FinanceStatCard
            footer={<DeltaText positiveIsGood suffix="较上月" value={summary.incomeDelta} />}
            icon={TrendingUp}
            label="本月收入"
            value={formatMoney(summary.monthIncome, 0)}
          />
          <FinanceStatCard
            footer={<DeltaText positiveIsGood={false} suffix="较上月" value={summary.expenseDelta} />}
            icon={CreditCard}
            label="本月支出"
            value={formatMoney(summary.monthExpense, 0)}
          />
          <FinanceStatCard
            footer={
              <Badge className={cn(summary.savingsRate >= 20 ? 'bg-chart-2/12! text-chart-2!' : summary.savingsRate >= 0 ? 'bg-chart-4/12! text-chart-4!' : 'bg-destructive/10! text-destructive!')}>
                储蓄率 {summary.savingsRate}%
              </Badge>
            }
            icon={PiggyBank}
            label="本月结余"
            value={formatMoney(summary.monthBalance, 0)}
          />
        </section>

        <section className="grid grid-cols-12 gap-px border-b bg-border">
          <div className="col-span-12 xl:col-span-7">
            <IncomeExpenseTrend trend={summary.monthlyTrend} />
          </div>
          <div className="col-span-12 xl:col-span-5">
            <CategoryBreakdown slices={summary.categoryBreakdown} />
          </div>
        </section>

        <section className="grid grid-cols-12 gap-px border-b bg-border">
          <div className="col-span-12 lg:col-span-5">
            <AccountsPanel accounts={summary.accounts} />
          </div>
          <div className="col-span-12 lg:col-span-7">
            <BudgetPanel budgets={summary.budgets} />
          </div>
        </section>

        <section className="bg-background p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 font-semibold">
                <ArrowLeftRight className="text-muted-foreground" size={16} />
                交易明细
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">手机端记录的每一笔收支都会同步到这里，可按分类、账户或描述搜索。</p>
            </div>
            <Badge className="bg-primary/10! text-primary!">共 {transactions.length} 笔</Badge>
          </div>
          <DataTable centered columns={columns} data={transactions} fillHeight={false} searchPlaceholder="搜索交易…" />
        </section>
      </Card>
    </AppPage>
  )
}
