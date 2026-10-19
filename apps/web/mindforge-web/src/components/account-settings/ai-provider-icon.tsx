import { Bot } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AiProviderPreset } from './ai-providers';

/**
 * 服务商品牌图标：品牌色圆角底块 + 单色 logo。
 * 未传入预设时展示中性的自定义接口图标。
 */
export function AiProviderIcon({
  preset,
  size = 'default',
}: {
  preset?: AiProviderPreset;
  size?: 'sm' | 'default' | 'lg';
}) {
  const box = size === 'sm' ? 'size-8 rounded-lg' : size === 'lg' ? 'size-11 rounded-xl' : 'size-9 rounded-xl';
  const glyph = size === 'sm' ? 'size-4' : size === 'lg' ? 'size-6' : 'size-5';

  return (
    <span
      aria-hidden="true"
      className={cn(
        'flex shrink-0 items-center justify-center text-white shadow-xs ring-1 ring-black/5 dark:ring-white/10',
        box,
      )}
      style={{ backgroundColor: preset?.color ?? '#64748b' }}
    >
      {preset ? (
        <svg
          viewBox="0 0 24 24"
          className={glyph}
          dangerouslySetInnerHTML={{ __html: preset.icon }}
        />
      ) : (
        <Bot className={glyph} />
      )}
    </span>
  );
}
