import { useMemo, type CSSProperties, type ReactNode } from 'react';
import { useWorkspaceAppearance } from '@/hooks/use-workspace-appearance';
import { cn } from '@/lib/utils';
import type { BackgroundStyle } from '@/types/apps/settings';
import './workspace-background.css';

function watermarkImage(name: string, color: string) {
  const text = name.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&apos;',
    };
    return entities[character];
  });
  // 限制长用户名的绘制宽度，保留完整文字并避免相邻水印相互重叠。
  const fit =
    Array.from(name).length > 12 ? ' textLength="210" lengthAdjust="spacingAndGlyphs"' : '';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="280" height="180" viewBox="0 0 280 180"><text x="140" y="90" text-anchor="middle" dominant-baseline="middle" transform="rotate(-24 140 90)" font-family="sans-serif" font-size="20" font-weight="500" fill="${color}"${fit}>${text}</text></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

function useWatermarkStyle(watermarkName: string): CSSProperties {
  return useMemo(
    () =>
      ({
        '--workspace-watermark-light': watermarkName
          ? watermarkImage(watermarkName, '#0000000e')
          : 'none',
        '--workspace-watermark-dark': watermarkName
          ? watermarkImage(watermarkName, '#ffffff12')
          : 'none',
      }) as CSSProperties,
    [watermarkName],
  );
}

export function BackgroundPreview({
  background,
  watermarkName,
  className,
}: {
  background: BackgroundStyle;
  watermarkName: string;
  className?: string;
}) {
  const style = useWatermarkStyle(watermarkName || '用户名');
  return (
    <div
      aria-hidden="true"
      className={cn('workspace-background-preview', className)}
      data-background={background}
      style={style}
    />
  );
}

export default function WorkspaceBackground({ children }: { children: ReactNode }) {
  const { background, watermarkName } = useWorkspaceAppearance();
  const style = useWatermarkStyle(watermarkName);
  return (
    <div
      className="workspace-background flex flex-1 flex-col gap-4 p-4"
      data-background={background}
      style={style}
    >
      {children}
    </div>
  );
}
