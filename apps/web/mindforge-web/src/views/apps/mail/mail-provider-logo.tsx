import { Mail } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MAIL_PROVIDER_LOGOS } from './mail-provider-logos';

const SIZES = {
  xs: { box: 'size-5 rounded', glyph: 'size-3', text: 'text-[9px]' },
  sm: { box: 'size-6 rounded-md', glyph: 'size-3.5', text: 'text-[9px]' },
  default: { box: 'size-8 rounded-lg', glyph: 'size-4', text: 'text-[10px]' },
  lg: { box: 'size-10 rounded-xl', glyph: 'size-5', text: 'text-xs' },
} as const;

/**
 * 邮箱服务商 Logo：品牌色底块 + 品牌图形（或 163/126 文字标识）。
 * 未知服务商回退为中性信封图标。
 */
export function MailProviderLogo({
  provider,
  size = 'default',
  className,
}: {
  provider?: string;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const logo = provider ? MAIL_PROVIDER_LOGOS[provider.toLowerCase()] : undefined;
  const spec = SIZES[size];

  return (
    <span
      aria-hidden="true"
      className={cn(
        'flex shrink-0 items-center justify-center',
        spec.box,
        logo?.tileClass ?? 'bg-muted text-muted-foreground',
        className,
      )}
    >
      {logo?.body ? (
        <svg
          viewBox={logo.viewBox ?? '0 0 24 24'}
          className={spec.glyph}
          dangerouslySetInnerHTML={{ __html: logo.body }}
        />
      ) : logo?.text ? (
        <span className={cn('font-semibold tracking-tight', spec.text)}>{logo.text}</span>
      ) : (
        <Mail className={spec.glyph} />
      )}
    </span>
  );
}
