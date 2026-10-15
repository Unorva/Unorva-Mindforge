export function mailError(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

export function mailDate(value: string | null | undefined, full = false) {
  if (!value) return '尚未同步';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '时间未知';
  return full
    ? date.toLocaleString('zh-CN')
    : date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
}

export function emailAddress(value: string) {
  return value.match(/<([^<>]+)>/)?.[1]?.trim() ?? value.trim();
}
import type { MailItem } from '@/api/mail/mail';

export function sortMails(items: MailItem[]) {
  return [...items].sort(
    (left, right) =>
      (new Date(right.createdAt).getTime() || 0) - (new Date(left.createdAt).getTime() || 0) ||
      right.id - left.id,
  );
}
