import { Mail } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MAIL_PROVIDER_LOGOS } from './mail-provider-logos';

const SIZES = {
  xs: { box: 'size-5 rounded', image: 'size-4', glyph: 'size-3' },
  sm: { box: 'size-6 rounded-md', image: 'size-5', glyph: 'size-3.5' },
  default: { box: 'size-8 rounded-lg', image: 'size-6', glyph: 'size-4' },
  lg: { box: 'size-10 rounded-xl', image: 'size-8', glyph: 'size-5' },
} as const;

/**
 * 邮箱服务商 Logo：保留官网标签页图标的原始颜色与透明背景。
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
        !logo?.src && 'bg-muted text-muted-foreground',
        className,
      )}
    >
      {logo?.src ? (
        <img src={logo.src} alt="" draggable={false} className={cn('object-contain', spec.image)} />
      ) : (
        <Mail className={spec.glyph} />
      )}
    </span>
  );
}
