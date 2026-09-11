import { getFetcher } from '@/api/global-fetcher'
import type { ApiResult } from '@/types/api'

export type TransactionType = '收入' | '支出'
export type TransactionSource = '手机端' | '自动同步' | '手动录入'
export type AccountType = '现金' | '储蓄' | '投资' | '电子钱包'

export type Account = {
  id: number
  name: string
  type: AccountType
  balance: number
}

export type Transaction = {
  id: number
  date: string
  type: TransactionType
  category: string
  description: string
  accountId: number
  amount: number
  source: TransactionSource
}

export type MonthlyPoint = {
  month: string
  income: number
  expense: number
}

export type CategorySlice = {
  category: string
  amount: number
}

export type BudgetItem = {
  category: string
  budget: number
  spent: number
}

export type FinanceSummary = {
  totalAssets: number
  monthIncome: number
  monthExpense: number
  monthBalance: number
  savingsRate: number
  incomeDelta: number
  expenseDelta: number
  lastSyncAt: string
  accounts: Account[]
  monthlyTrend: MonthlyPoint[]
  categoryBreakdown: CategorySlice[]
  budgets: BudgetItem[]
}

export function getFinanceSummary() {
  return getFetcher('/finance/summary') as Promise<ApiResult<FinanceSummary>>
}

export function getFinanceTransactions() {
  return getFetcher('/finance/transactions') as Promise<ApiResult<Transaction[]>>
}
