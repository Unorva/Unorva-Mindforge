import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CONNECTOR_BRAND_ICONS } from './connector-icons';

/**
 * 连接器图标：优先渲染内置品牌 SVG，没有品牌图标时回退到 lucide 图标。
 */
export function ConnectorLogo({
  brand,
  icon: Icon,
  iconClassName,
  className,
}: {
  brand?: string;
  icon?: LucideIcon;
  iconClassName?: string;
  className?: string;
}) {
  const brandIcon = brand ? CONNECTOR_BRAND_ICONS[brand] : undefined;

  return (
    <span
      aria-hidden="true"
      className={cn('flex size-8 shrink-0 items-center justify-center', brandIcon?.frame, className)}
    >
      {brandIcon ? (
        <svg
          viewBox={brandIcon.viewBox}
          className={cn('size-full', brandIcon.tone)}
          dangerouslySetInnerHTML={{ __html: brandIcon.body }}
        />
      ) : Icon ? (
        <Icon className={cn('size-6', iconClassName)} />
      ) : null}
    </span>
  );
}
