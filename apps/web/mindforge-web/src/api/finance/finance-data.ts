import { format, startOfMonth, sub } from 'date-fns'
import { http, HttpResponse } from 'msw'

import type { ApiResult } from '@/types/api'
import type {
  Account,
  BudgetItem,
  CategorySlice,
  FinanceSummary,
  MonthlyPoint,
  Transaction,
  TransactionSource,
} from './finance'

const today = new Date()
const monthCount = 12

function createRandom(seed: number) {
  let state = seed
  return () => {
    state = (state * 9301 + 49297) % 233280
    return state / 233280
  }
}

const random = createRandom(20260909)

function pick<T>(items: readonly T[]) {
  return items[Math.floor(random() * items.length)]
}

function randomAmount(min: number, max: number) {
  return Math.round((min + random() * (max - min)) * 100) / 100
}

function randomSource(): TransactionSource {
  const value = random()
  if (value < 0.68) return '手机端'
  if (value < 0.9) return '自动同步'
  return '手动录入'
}

const accounts: Account[] = [
  { id: 1, name: '招商银行储蓄卡', type: '储蓄', balance: 86500 },
  { id: 2, name: '支付宝', type: '电子钱包', balance: 12380.5 },
  { id: 3, name: '微信支付', type: '电子钱包', balance: 3265.8 },
  { id: 4, name: '基金账户', type: '投资', balance: 45200 },
  { id: 5, name: '现金钱包', type: '现金', balance: 860 },
]

const expensePlans = [
  { category: '餐饮美食', descriptions: ['午餐外卖', '晚餐小聚', '早餐咖啡', '生鲜超市', '周末大餐'], min: 15, max: 320, count: 10, accountIds: [2, 3] },
  { category: '交通出行', descriptions: ['地铁通勤', '打车回家', '共享单车', '城际高铁'], min: 2, max: 280, count: 6, accountIds: [2, 3] },
  { category: '购物消费', descriptions: ['日用补给', '换季服饰', '数码配件', '家居好物'], min: 30, max: 1200, count: 4, accountIds: [2, 3, 1] },
  { category: '休闲娱乐', descriptions: ['电影票', '游戏充值', '健身月卡', '视频会员'], min: 15, max: 400, count: 3, accountIds: [2, 3] },
  { category: '医疗健康', descriptions: ['常备药品', '门诊挂号', '年度体检'], min: 25, max: 800, count: 1, accountIds: [1, 2] },
  { category: '学习提升', descriptions: ['在线课程', '技术书籍', '知识星球'], min: 30, max: 600, count: 2, accountIds: [2, 1] },
  { category: '人情往来', descriptions: ['婚礼红包', '聚会请客', '生日礼物'], min: 100, max: 1000, count: 1, accountIds: [3, 2] },
  { category: '通讯网络', descriptions: ['手机话费', '家庭宽带', '云盘会员'], min: 30, max: 160, count: 1, accountIds: [1, 2] },
]

const fixedExpenses: { category: string; description: string; day: number; amount: () => number; accountId: number }[] = [
  { category: '居住物业', description: '房屋房租', day: 1, amount: () => 3500, accountId: 1 },
  { category: '居住物业', description: '物业管理费', day: 1, amount: () => 186, accountId: 1 },
  { category: '居住物业', description: '水电燃气', day: 15, amount: () => randomAmount(120, 320), accountId: 1 },
]

const sideJobDescriptions = ['设计外包尾款', '技术咨询费', '闲置转卖', '约稿收入']
const extraIncomeDescriptions = ['差旅报销', '朋友还款', '节日红包']
const investmentDescriptions = ['基金分红', '余额宝收益', '存款利息']

const transactions: Transaction[] = []
let nextId = 1

for (let offset = monthCount - 1; offset >= 0; offset -= 1) {
  const monthStart = startOfMonth(sub(today, { months: offset }))
  const isCurrentMonth = offset === 0
  const maxDay = isCurrentMonth ? today.getDate() : 28
  const scale = isCurrentMonth ? today.getDate() / 30 : 1

  const monthDate = (day: number) => {
    const date = new Date(monthStart)
    date.setDate(Math.min(day, Math.max(maxDay, 1)))
    return format(date, 'yyyy-MM-dd')
  }

  transactions.push({
    id: nextId++,
    date: monthDate(10),
    type: '收入',
    category: '工资薪酬',
    description: offset % 6 === 0 ? '月度工资 + 季度奖金' : '月度工资',
    accountId: 1,
    amount: offset % 6 === 0 ? 21800 : 15800,
    source: '自动同步',
  })

  transactions.push({
    id: nextId++,
    date: monthDate(20),
    type: '收入',
    category: '理财收益',
    description: pick(investmentDescriptions),
    accountId: pick([1, 4]),
    amount: randomAmount(80, 520),
    source: '自动同步',
  })

  if (random() < 0.55) {
    const sideJobCount = random() < 0.4 ? 2 : 1
    for (let index = 0; index < sideJobCount; index += 1) {
      transactions.push({
        id: nextId++,
        date: monthDate(1 + Math.floor(random() * 28)),
        type: '收入',
        category: '副业收入',
        description: pick(sideJobDescriptions),
        accountId: pick([2, 3]),
        amount: randomAmount(300, 2600),
        source: '手机端',
      })
    }
  }

  if (random() < 0.4) {
    transactions.push({
      id: nextId++,
      date: monthDate(1 + Math.floor(random() * 28)),
      type: '收入',
      category: '其他收入',
      description: pick(extraIncomeDescriptions),
      accountId: pick([2, 3]),
      amount: randomAmount(100, 900),
      source: randomSource(),
    })
  }

  for (const fixed of fixedExpenses) {
    transactions.push({
      id: nextId++,
      date: monthDate(fixed.day),
      type: '支出',
      category: fixed.category,
      description: fixed.description,
      accountId: fixed.accountId,
      amount: fixed.amount(),
      source: '自动同步',
    })
  }

  for (const plan of expensePlans) {
    const count = isCurrentMonth ? Math.max(1, Math.round(plan.count * scale)) : plan.count
    for (let index = 0; index < count; index += 1) {
      transactions.push({
        id: nextId++,
        date: monthDate(1 + Math.floor(random() * 28)),
        type: '支出',
        category: plan.category,
        description: pick(plan.descriptions),
        accountId: pick(plan.accountIds),
        amount: randomAmount(plan.min, plan.max),
        source: randomSource(),
      })
    }
  }
}

transactions.sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id)

const currentMonthKey = format(today, 'yyyy-MM')

function monthKey(date: string) {
  return date.slice(0, 7)
}

function sumAmount(list: Transaction[], type: Transaction['type']) {
  return Math.round(list.filter((item) => item.type === type).reduce((total, item) => total + item.amount, 0) * 100) / 100
}

const monthlyTrend: MonthlyPoint[] = Array.from({ length: monthCount }, (_, index) => monthCount - 1 - index).map((offset) => {
  const key = format(sub(today, { months: offset }), 'yyyy-MM')
  const monthTransactions = transactions.filter((item) => monthKey(item.date) === key)
  return {
    month: key,
    income: sumAmount(monthTransactions, '收入'),
    expense: sumAmount(monthTransactions, '支出'),
  }
})

const currentPoint = monthlyTrend[monthCount - 1]
const lastPoint = monthlyTrend[monthCount - 2]

function deltaPercent(current: number, previous: number) {
  if (!previous) return 0
  return Math.round(((current - previous) / previous) * 1000) / 10
}

const currentMonthTransactions = transactions.filter((item) => monthKey(item.date) === currentMonthKey)
const monthIncome = currentPoint.income
const monthExpense = currentPoint.expense
const monthBalance = Math.round((monthIncome - monthExpense) * 100) / 100

const categoryBreakdown: CategorySlice[] = expensePlans
  .map(({ category }) => ({
    category,
    amount: sumAmount(currentMonthTransactions.filter((item) => item.category === category), '支出'),
  }))
  .concat([{
    category: '居住物业',
    amount: sumAmount(currentMonthTransactions.filter((item) => item.category === '居住物业'), '支出'),
  }])
  .filter((slice) => slice.amount > 0)
  .sort((a, b) => b.amount - a.amount)

const budgetPlan: Record<string, number> = {
  餐饮美食: 2800,
  交通出行: 600,
  购物消费: 1500,
  居住物业: 4200,
  休闲娱乐: 700,
  医疗健康: 500,
  学习提升: 600,
  人情往来: 800,
  通讯网络: 200,
}

const budgets: BudgetItem[] = Object.entries(budgetPlan).map(([category, budget]) => ({
  category,
  budget,
  spent: categoryBreakdown.find((slice) => slice.category === category)?.amount ?? 0,
}))

const summary: FinanceSummary = {
  totalAssets: Math.round(accounts.reduce((total, account) => total + account.balance, 0) * 100) / 100,
  monthIncome,
  monthExpense,
  monthBalance,
  savingsRate: monthIncome > 0 ? Math.round((monthBalance / monthIncome) * 1000) / 10 : 0,
  incomeDelta: deltaPercent(currentPoint.income, lastPoint.income),
  expenseDelta: deltaPercent(currentPoint.expense, lastPoint.expense),
  lastSyncAt: format(sub(today, { minutes: 42 }), 'yyyy-MM-dd HH:mm'),
  accounts,
  monthlyTrend,
  categoryBreakdown,
  budgets,
}

function success<T>(data: T) {
  return HttpResponse.json({ code: 200, success: true, message: 'ok', data } satisfies ApiResult<T>)
}

export const FinanceHandlers = [
  http.get('/finance/summary', () => success(summary)),
  http.get('/finance/transactions', () => success(transactions)),
]
