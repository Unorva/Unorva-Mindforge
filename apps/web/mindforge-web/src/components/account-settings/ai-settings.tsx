import { useEffect, useState } from 'react';
import {
  Check,
  ChevronDown,
  ExternalLink,
  Loader2,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
  Zap,
} from 'lucide-react';
import { deleteFetcher, postFetcher } from '@/api/global-fetcher';
import { AiProviderIcon } from '@/components/account-settings/ai-provider-icon';
import {
  AI_PROVIDER_PRESETS,
  CUSTOM_PROVIDER_ID,
  findAiProviderPreset,
  matchAiProviderPreset,
  type AiProviderPreset,
} from '@/components/account-settings/ai-providers';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { TabsContent } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/toast';
import { useSettings } from '@/context/settings-context';
import { cn } from '@/lib/utils';
import type { ApiResult } from '@/types/api';
import type { AiSettings as AiSettingsData } from '@/types/apps/settings';

const LANGUAGES = ['简体中文', '英语', '日语'];
const CUSTOM_MODEL_VALUE = '__custom_model__';
type BusyAction = 'save' | 'save-test' | 'test' | 'clear' | null;

/** 单个功能开关行。 */
function FeatureRow({
  title,
  description,
  checked,
  onCheckedChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <p className="font-medium">{title}</p>
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

/** 回复语言选择。 */
function LanguageSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <Select value={value} onValueChange={(nextValue) => nextValue && onChange(nextValue)}>
      <SelectTrigger aria-label="回复语言" className="w-full cursor-pointer">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {LANGUAGES.map((language) => (
          <SelectItem className="cursor-pointer" key={language} value={language}>
            {language}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** 服务商选择卡片。 */
function ProviderCard({
  preset,
  selected,
  onSelect,
}: {
  preset: AiProviderPreset;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={cn(
        'flex cursor-pointer items-center gap-2.5 rounded-xl border p-2.5 text-left transition-colors',
        selected
          ? 'border-primary/60 bg-primary/5 ring-2 ring-primary/20'
          : 'border-border bg-card hover:bg-muted/50',
      )}
    >
      <AiProviderIcon preset={preset} size="sm" />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span className="truncate text-sm font-medium">{preset.name}</span>
          {preset.featured && (
            <Badge className="h-4 px-1.5 text-[10px]" variant="secondary">
              推荐
            </Badge>
          )}
        </span>
        <span className="mt-0.5 block truncate text-xs text-muted-foreground">
          {preset.vendor} · {preset.description}
        </span>
      </span>
      <Check className={cn('size-4 shrink-0', selected ? 'text-primary' : 'text-transparent')} />
    </button>
  );
}

/** 自定义兼容接口卡片。 */
function CustomProviderCard({
  selected,
  onSelect,
}: {
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={cn(
        'flex cursor-pointer items-center gap-2.5 rounded-xl border p-2.5 text-left transition-colors',
        selected
          ? 'border-primary/60 bg-primary/5 ring-2 ring-primary/20'
          : 'border-border bg-card hover:bg-muted/50',
      )}
    >
      <AiProviderIcon size="sm" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">自定义 / OpenAI 兼容</span>
        <span className="mt-0.5 block truncate text-xs text-muted-foreground">
          其他国内平台或自建网关
        </span>
      </span>
      <Check className={cn('size-4 shrink-0', selected ? 'text-primary' : 'text-transparent')} />
    </button>
  );
}

/**
 * 账户设置中的 AI 配置页签：内置国内主流大模型预设，
 * 选择服务商后只需填写 API Key，接口地址与模型自动带出。
 */
export default function AiSettings() {
  const { settings, saveAiSettings } = useSettings();
  const savedAi = settings?.ai;
  const [draft, setDraft] = useState<AiSettingsData | null>(savedAi ?? null);
  const [presetId, setPresetId] = useState(() =>
    matchAiProviderPreset(savedAi?.provider ?? '', savedAi?.baseUrl),
  );
  const [customModel, setCustomModel] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [busy, setBusy] = useState<BusyAction>(null);

  useEffect(() => {
    if (!savedAi) return;
    const nextPresetId = matchAiProviderPreset(savedAi.provider, savedAi.baseUrl);
    const nextPreset = findAiProviderPreset(nextPresetId);
    setDraft(savedAi);
    setPresetId(nextPresetId);
    setCustomModel(nextPresetId === CUSTOM_PROVIDER_ID || !nextPreset?.models.includes(savedAi.model));
  }, [savedAi]);

  if (!draft || !settings) return null;

  const configured = settings.ai.configured;
  const preset = findAiProviderPreset(presetId);
  const isCustomProvider = presetId === CUSTOM_PROVIDER_ID || !preset;
  const modelOptions = preset?.models ?? [];
  const modelIsCustom = isCustomProvider || customModel || !modelOptions.includes(draft.model);

  const update = (patch: Partial<AiSettingsData>) => {
    setDraft((current) => (current ? { ...current, ...patch } : current));
  };

  const choosePreset = (next: AiProviderPreset) => {
    setPresetId(next.id);
    setCustomModel(false);
    setAdvancedOpen(false);
    setDraft((current) =>
      current
        ? {
            ...current,
            provider: next.name,
            baseUrl: next.baseUrl,
            model: next.models[0] ?? current.model,
          }
        : current,
    );
  };

  const chooseCustom = () => {
    setPresetId(CUSTOM_PROVIDER_ID);
    setCustomModel(true);
    setAdvancedOpen(false);
    setDraft((current) =>
      current
        ? {
            ...current,
            // 从预设切到自定义时清空服务商名称，避免误用预设名称。
            provider: preset ? '' : current.provider,
          }
        : current,
    );
  };

  const handleModelSelect = (value: string) => {
    if (value === CUSTOM_MODEL_VALUE) {
      setCustomModel(true);
      update({ model: '' });
      return;
    }
    setCustomModel(false);
    update({ model: value });
  };

  const validate = (): string | null => {
    const baseUrl = draft.baseUrl?.trim() ?? '';
    let validUrl = false;
    try {
      validUrl = ['http:', 'https:'].includes(new URL(baseUrl).protocol);
    } catch {
      /* 输入尚未构成完整 URL。 */
    }
    if (!validUrl) return '请填写有效的接口地址（以 http:// 或 https:// 开头）';
    if (!draft.provider.trim()) return '请选择模型服务商或填写服务商名称';
    if (!draft.model.trim()) return '请选择或填写模型名称';
    if (!Number.isInteger(draft.maxTokens) || draft.maxTokens < 256 || draft.maxTokens > 8192) {
      return '最大 Token 数需为 256–8192 的整数';
    }
    if (!draft.apiKey?.trim() && !configured) return `请填写 ${draft.provider.trim()} 的 API Key`;
    return null;
  };

  /** 校验并保存当前草稿；返回是否保存成功。 */
  const persist = async (): Promise<boolean> => {
    const error = validate();
    if (error) {
      toast.add({ type: 'error', title: error });
      return false;
    }
    await saveAiSettings({
      ...draft,
      provider: draft.provider.trim(),
      model: draft.model.trim(),
      baseUrl: draft.baseUrl?.trim() ?? '',
    });
    setDraft((current) => (current ? { ...current, apiKey: '' } : current));
    return true;
  };

  const handleSave = async (testAfterSave: boolean) => {
    if (busy) return;
    setBusy(testAfterSave ? 'save-test' : 'save');
    try {
      if (!(await persist())) return;
      toast.add({ type: 'success', title: 'AI 配置已保存' });
      if (testAfterSave) {
        const result = (await postFetcher('/ai/test')) as ApiResult<{ message?: string }>;
        toast.add({
          type: 'success',
          title: result.data?.message || '接口连接正常',
          description: `${draft.provider.trim()} · ${draft.model.trim()}`,
        });
      }
    } catch {
      // 请求失败时 global-fetcher 已统一弹出错误提示。
    } finally {
      setBusy(null);
    }
  };

  const handleTest = async () => {
    if (busy) return;
    setBusy('test');
    try {
      const result = (await postFetcher('/ai/test')) as ApiResult<{ message?: string }>;
      toast.add({ type: 'success', title: result.data?.message || '接口连接正常' });
    } catch {
      // 请求失败时 global-fetcher 已统一弹出错误提示。
    } finally {
      setBusy(null);
    }
  };

  const handleClear = async () => {
    if (busy) return;
    setBusy('clear');
    try {
      await deleteFetcher('/api/data/settings/ai/credentials');
      await saveAiSettings({ ...settings.ai, apiKey: '' });
      toast.add({ type: 'success', title: '已清除保存的 API Key' });
    } catch {
      // 请求失败时 global-fetcher 已统一弹出错误提示。
    } finally {
      setBusy(null);
    }
  };

  return (
    <TabsContent
      value="ai"
      className="m-0 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
    >
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 pr-10 sm:p-6 sm:pr-12">
        <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-medium">AI 配置</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            选择国内主流大模型，填写 API Key 即可使用；也支持任意 OpenAI 兼容接口。
          </p>
        </div>
        <Badge className="gap-1.5" variant="outline">
          <span
            className={cn(
              'size-1.5 rounded-full',
              configured ? 'bg-emerald-500' : 'bg-muted-foreground',
            )}
          />
          {configured ? '已配置密钥' : '未配置密钥'}
        </Badge>
      </div>

      <div className="space-y-2">
        <Label>模型服务商</Label>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {AI_PROVIDER_PRESETS.map((item) => (
            <ProviderCard
              key={item.id}
              preset={item}
              selected={!isCustomProvider && presetId === item.id}
              onSelect={() => choosePreset(item)}
            />
          ))}
          <CustomProviderCard selected={isCustomProvider} onSelect={chooseCustom} />
        </div>
      </div>

      <Card size="sm">
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <AiProviderIcon preset={preset} />
              <div className="min-w-0">
                <p className="font-medium">{preset?.name ?? '自定义兼容接口'}</p>
                <p className="mt-0.5 break-all text-xs text-muted-foreground">
                  {preset ? `${preset.vendor} · 已自动填入接口地址与模型` : '兼容 OpenAI Chat Completions 的任意接口'}
                </p>
              </div>
            </div>
            <Badge variant="secondary">{draft.model || '未选择模型'}</Badge>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="ai-api-key">API Key</Label>
              {preset && (
                <a
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                  href={preset.apiKeyUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  获取 {preset.name} 密钥
                  <ExternalLink className="size-3" />
                </a>
              )}
            </div>
            <Input
              id="ai-api-key"
              type="password"
              autoComplete="new-password"
              maxLength={512}
              value={draft.apiKey ?? ''}
              placeholder={configured ? '已保存，留空保留；输入新值替换' : '粘贴服务商控制台生成的 API Key'}
              onChange={(event) => update({ apiKey: event.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              密钥只提交到后端保存，不会在浏览器回显完整内容。
            </p>
          </div>

          {isCustomProvider && (
            <div className="space-y-2">
              <Label htmlFor="ai-provider">服务商名称</Label>
              <Input
                id="ai-provider"
                maxLength={80}
                value={draft.provider}
                placeholder="例如 硅基流动 / 自建网关"
                onChange={(event) => update({ provider: event.target.value })}
              />
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="ai-model">默认模型</Label>
              {isCustomProvider ? (
                <Input
                  id="ai-model"
                  maxLength={120}
                  value={draft.model}
                  placeholder="输入接口支持的模型 ID"
                  onChange={(event) => update({ model: event.target.value })}
                />
              ) : (
                <>
                  <Select
                    value={modelIsCustom ? CUSTOM_MODEL_VALUE : draft.model}
                    onValueChange={(value) => value && handleModelSelect(value)}
                  >
                    <SelectTrigger id="ai-model" className="w-full cursor-pointer">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {modelOptions.map((model) => (
                        <SelectItem className="cursor-pointer" key={model} value={model}>
                          {model}
                        </SelectItem>
                      ))}
                      <SelectItem className="cursor-pointer" value={CUSTOM_MODEL_VALUE}>
                        自定义模型…
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  {modelIsCustom && (
                    <Input
                      maxLength={120}
                      value={draft.model}
                      placeholder="输入接口支持的模型 ID"
                      onChange={(event) => update({ model: event.target.value })}
                    />
                  )}
                </>
              )}
              <p className="text-xs text-muted-foreground">模型版本更新较快，可切换为自定义模型。</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ai-base-url">接口地址</Label>
              <Input
                id="ai-base-url"
                type="url"
                maxLength={1000}
                value={draft.baseUrl ?? ''}
                placeholder="https://api.example.com/v1"
                onChange={(event) => update({ baseUrl: event.target.value })}
              />
              <p className="text-xs text-muted-foreground">系统会自动追加 /chat/completions。</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Collapsible
        className="overflow-hidden rounded-xl border bg-card"
        open={advancedOpen}
        onOpenChange={setAdvancedOpen}
      >
        <CollapsibleTrigger className="flex w-full cursor-pointer items-center justify-between gap-3 px-4 py-3 text-left">
          <span className="flex items-center gap-2 font-medium">
            <SlidersHorizontal className="size-4" />
            高级设置
          </span>
          <span className="flex items-center gap-2 text-xs text-muted-foreground">
            温度 {draft.temperature.toFixed(1)} · 上限 {draft.maxTokens} Token
            <ChevronDown
              className={cn('size-4 transition-transform', advancedOpen && 'rotate-180')}
            />
          </span>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="space-y-5 border-t px-4 py-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="ai-temperature">生成温度（Temperature）</Label>
                <span className="text-sm text-muted-foreground">
                  {draft.temperature.toFixed(1)}
                </span>
              </div>
              <Slider
                id="ai-temperature"
                max={2}
                min={0}
                step={0.1}
                value={[draft.temperature]}
                onValueChange={(value) =>
                  update({ temperature: Array.isArray(value) ? value[0] : value })
                }
              />
              <p className="text-xs text-muted-foreground">
                数值越低回答越稳定，数值越高回答越有创造性。
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="ai-max-tokens">最大 Token 数</Label>
                <Input
                  id="ai-max-tokens"
                  min={256}
                  max={8192}
                  step={256}
                  type="number"
                  value={draft.maxTokens}
                  onChange={(event) =>
                    update({ maxTokens: Number(event.target.value) || 0 })
                  }
                />
                <p className="text-xs text-muted-foreground">范围 256–8192。</p>
              </div>
              <div className="space-y-2">
                <Label>回复语言</Label>
                <LanguageSelect
                  value={draft.language}
                  onChange={(language) => update({ language })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ai-system-prompt">系统提示词</Label>
              <Textarea
                id="ai-system-prompt"
                className="min-h-24"
                maxLength={4000}
                placeholder="定义 AI 助手在工作区中的角色与回复风格"
                value={draft.systemPrompt}
                onChange={(event) => update({ systemPrompt: event.target.value })}
              />
            </div>

            <Separator />

            <div className="space-y-3">
              <div>
                <h4 className="font-medium">AI 能力</h4>
                <p className="mt-1 text-xs text-muted-foreground">
                  保存各项功能的启用偏好，具体能力会随功能入口逐步开放。
                </p>
              </div>
              <div className="space-y-3">
                <FeatureRow
                  title="智能摘要"
                  description="为长内容生成摘要。"
                  checked={draft.features.smartSummary}
                  onCheckedChange={(smartSummary) =>
                    update({ features: { ...draft.features, smartSummary } })
                  }
                />
                <FeatureRow
                  title="自动标签"
                  description="保存自动标签偏好，自动执行尚未配置。"
                  checked={draft.features.autoTag}
                  onCheckedChange={(autoTag) =>
                    update({ features: { ...draft.features, autoTag } })
                  }
                />
                <FeatureRow
                  title="每日复盘草稿"
                  description="可在工作日志中手动生成 AI 总结。"
                  checked={draft.features.dailyReviewDraft}
                  onCheckedChange={(dailyReviewDraft) =>
                    update({ features: { ...draft.features, dailyReviewDraft } })
                  }
                />
                <FeatureRow
                  title="邮件写作助手"
                  description="在 AI 助手中撰写邮件正文。"
                  checked={draft.features.emailComposeAssist}
                  onCheckedChange={(emailComposeAssist) =>
                    update({ features: { ...draft.features, emailComposeAssist } })
                  }
                />
              </div>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t bg-card px-4 py-3 sm:px-6">
        <Button disabled={busy !== null} onClick={() => void handleSave(true)}>
          {busy === 'save-test' ? <Loader2 className="animate-spin" /> : <Zap />}
          {busy === 'save-test' ? '正在保存并测试…' : '保存并测试'}
        </Button>
        <Button variant="outline" disabled={busy !== null} onClick={() => void handleSave(false)}>
          {busy === 'save' ? <Loader2 className="animate-spin" /> : <Check />}
          仅保存
        </Button>
        <div className="min-w-2 flex-1" />
        <Button
          variant="ghost"
          size="sm"
          disabled={busy !== null || !configured}
          onClick={() => void handleTest()}
        >
          {busy === 'test' ? <Loader2 className="animate-spin" /> : <ShieldCheck />}
          测试已保存的连接
        </Button>
        {configured && (
          <Button
            className="text-destructive hover:text-destructive"
            variant="ghost"
            size="sm"
            disabled={busy !== null}
            onClick={() => void handleClear()}
          >
            {busy === 'clear' ? <Loader2 className="animate-spin" /> : <Trash2 />}
            清除密钥
          </Button>
        )}
      </div>
    </TabsContent>
  );
}
