import { useEffect, useState } from 'react';
import { Check, Loader2 } from 'lucide-react';

import { BackgroundPreview } from '@/components/shared/workspace-background';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from '@/components/ui/toast';
import { useSettings } from '@/context/settings-context';
import { useWorkspaceAppearance } from '@/hooks/use-workspace-appearance';
import { cn } from '@/lib/utils';
import type { BackgroundStyle } from '@/types/apps/settings';

const BACKGROUND_OPTIONS: {
  value: BackgroundStyle;
  label: string;
  description: string;
}[] = [
  { value: 'plain', label: '默认纯色', description: '保留简洁的纯色工作区。' },
  { value: 'dots', label: '斑点', description: '细密、轻盈的点阵纹理。' },
  { value: 'watermark', label: '用户名水印', description: '以个人资料昵称平铺展示。' },
];

export default function AppearanceSettings() {
  const { settings, loading, error, saveAppearance } = useSettings();
  const { watermarkName } = useWorkspaceAppearance();
  const savedBackground = settings?.appearance?.background ?? 'plain';
  const [background, setBackground] = useState<BackgroundStyle>(savedBackground ?? 'plain');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (savedBackground) setBackground(savedBackground);
  }, [savedBackground]);

  const handleSave = async () => {
    if (saving || loading || error || !settings) return;
    setSaving(true);
    try {
      await saveAppearance({ background });
      toast.add({ type: 'success', title: '背景设置已保存' });
    } catch {
      // 请求失败由 global-fetcher 提示，保留当前选择以便重试。
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-medium">背景设置</h3>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          为工作区选择背景，浅色主题使用白色底，深色主题自动适配。选择后可预览，保存后生效。
        </p>
      </div>

      {error ? (
        <p
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
        >
          背景设置加载失败。可以继续预览，重新打开设置后再保存。
        </p>
      ) : loading || !settings ? (
        <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          正在加载已保存的背景，可以先选择预览。
        </p>
      ) : null}

      <RadioGroup
        aria-label="工作区背景"
        className="gap-3 sm:grid-cols-3"
        disabled={saving}
        value={background}
        onValueChange={(value) => setBackground(value as BackgroundStyle)}
      >
        {BACKGROUND_OPTIONS.map((option) => (
          <label
            key={option.value}
            htmlFor={`workspace-background-${option.value}`}
            className={cn(
              'min-w-0 cursor-pointer overflow-hidden rounded-lg border bg-background transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-offset-2',
              background === option.value
                ? 'border-primary ring-1 ring-primary'
                : 'border-border hover:border-foreground/40',
              saving && 'cursor-wait opacity-60',
            )}
          >
            <BackgroundPreview
              background={option.value}
              watermarkName={watermarkName}
              className="h-28 border-b border-border"
            />
            <span className="flex items-center gap-2 px-3 pt-3 text-sm font-medium">
              <RadioGroupItem
                id={`workspace-background-${option.value}`}
                value={option.value}
                aria-describedby={`workspace-background-${option.value}-description`}
              />
              {option.label}
            </span>
            <span
              id={`workspace-background-${option.value}-description`}
              className="block px-3 pt-2 pb-3 text-xs leading-5 text-muted-foreground"
            >
              {option.description}
            </span>
          </label>
        ))}
      </RadioGroup>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h4 className="text-sm font-medium">背景预览</h4>
          <span className="text-xs text-muted-foreground">
            {BACKGROUND_OPTIONS.find((option) => option.value === background)?.label}
          </span>
        </div>
        <BackgroundPreview
          background={background}
          watermarkName={watermarkName}
          className="h-48 rounded-lg border border-border sm:h-56"
        />
        <p className="text-xs leading-5 text-muted-foreground">
          用户名水印使用个人资料中的昵称，修改昵称后自动更新。
        </p>
      </div>

      <div className="flex justify-end border-t pt-5">
        <Button
          disabled={saving || loading || !!error || !settings || background === savedBackground}
          onClick={() => void handleSave()}
        >
          {saving ? <Loader2 className="animate-spin" /> : <Check />}
          {saving ? '保存中…' : '保存背景'}
        </Button>
      </div>
    </div>
  );
}
