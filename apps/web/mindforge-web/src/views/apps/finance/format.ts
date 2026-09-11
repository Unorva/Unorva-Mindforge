export function formatMoney(value: number, decimals = 2) {
  return `¥${value.toLocaleString('zh-CN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`
}

export function formatCompactMoney(value: number) {
  if (value === 0) return '0'
  if (Math.abs(value) >= 10000) {
    const scaled = value / 10000
    return `${Number.isInteger(scaled) ? scaled : scaled.toFixed(1)}万`
  }
  return `${Math.round(value / 1000)}k`
}

export function formatMonthTick(value: string) {
  return `${Number(value.slice(5, 7))}月`
}

export function formatDelta(value: number) {
  return `${value >= 0 ? '+' : ''}${value}%`
}
