import { deleteFetcher, getFetcher, postFetcher, putFetcher } from '@/api/global-fetcher';
import type { ApiResult } from '@/types/api';

export type TransactionType = '收入' | '支出';
export type TransactionSource = '手机端' | '自动同步' | '手动录入';
export type AccountType = '现金' | '储蓄' | '投资' | '电子钱包';

export type Account = {
  id: number;
  name: string;
  type: AccountType;
  balance: number;
};

export type Transaction = {
  id: number;
  date: string;
  type: TransactionType;
  category: string;
  description: string;
  accountId: number;
  amount: number;
  source: TransactionSource;
};

export type MonthlyPoint = {
  month: string;
  income: number;
  expense: number;
};

export type CategorySlice = {
  category: string;
  amount: number;
};

export type BudgetItem = {
  id?: number;
  month?: string;
  category: string;
  budget: number;
  spent: number;
};

export type FinanceSummary = {
  totalAssets: number;
  monthIncome: number;
  monthExpense: number;
  monthBalance: number;
  savingsRate: number;
  incomeDelta: number;
  expenseDelta: number;
  lastSyncAt: string;
  accounts: Account[];
  monthlyTrend: MonthlyPoint[];
  categoryBreakdown: CategorySlice[];
  budgets: BudgetItem[];
};

export function getFinanceSummary() {
  return getFetcher('/finance/summary') as Promise<ApiResult<FinanceSummary>>;
}

export function getFinanceTransactions() {
  return getFetcher('/finance/transactions') as Promise<ApiResult<Transaction[]>>;
}

export const saveAccount = (
  account: Omit<Account, 'id'> & { id?: number },
): Promise<ApiResult<Account>> =>
  account.id
    ? putFetcher(`/finance/accounts/${account.id}`, account)
    : postFetcher('/finance/accounts', account);
export const deleteAccount = (id: number): Promise<ApiResult<void>> =>
  deleteFetcher(`/finance/accounts/${id}`);
export const saveTransaction = (
  transaction: Omit<Transaction, 'id'> & { id?: number },
): Promise<ApiResult<Transaction>> =>
  transaction.id
    ? putFetcher(`/finance/transactions/${transaction.id}`, transaction)
    : postFetcher('/finance/transactions', transaction);
export const deleteTransaction = (id: number): Promise<ApiResult<void>> =>
  deleteFetcher(`/finance/transactions/${id}`);
export const saveBudget = (budget: {
  month: string;
  category: string;
  budget: number;
}): Promise<ApiResult<BudgetItem>> => putFetcher('/finance/budgets', budget);
export const deleteBudget = (id: number): Promise<ApiResult<void>> =>
  deleteFetcher(`/finance/budgets/${id}`);
