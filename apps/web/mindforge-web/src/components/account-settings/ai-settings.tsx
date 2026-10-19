import { useEffect, useState } from 'react';
import {
  Check,
  ChevronDown,
  ExternalLink,
  KeyRound,
  Loader2,
  RotateCcw,
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@/components/ui/input-group';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from '@/components/ui/item';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
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

const AI_FEATURES: {
  key: keyof AiSettingsData['features'];
  title: string;
  description: string;
}[] = [
  { key: 'smartSummary', title: '智能摘要', description: '为长内容生成摘要。' },
  { key: 'autoTag', title: '自动标签', description: '保存自动标签偏好，自动执行尚未配置。' },
  { key: 'dailyReviewDraft', title: '每日复盘草稿', description: '可在工作日志中手动生成 AI 总结。' },
  { key: 'emailComposeAssist', title: '邮件写作助手', description: '在 AI 助手中撰写邮件正文。' },
];

function LanguageSelect({
  id,
  value,
  onChange,
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <Select value={value} onValueChange={(nextValue) => nextValue && onChange(nextValue)}>
      <SelectTrigger id={id} className="w-full cursor-pointer">
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

function providerInputId(id: string) {
  return `ai-provider-${id}`;
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
  const [clearOpen, setClearOpen] = useState(false);
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

  const handleProviderChange = (value: string) => {
    const next = findAiProviderPreset(value);
    if (next) {
      choosePreset(next);
      return;
    }
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
    <TabsContent value="ai" className="m-0 min-h-0 min-w-0 flex-1 space-y-4 overflow-y-auto p-4 pr-10 sm:p-6 sm:pr-12">
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
          <h4 className="text-sm font-medium">模型服务商</h4>
          <RadioGroup
            aria-label="模型服务商"
            className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3"
            value={presetId}
            onValueChange={(value) => handleProviderChange(value as string)}
          >
            {AI_PROVIDER_PRESETS.map((item) => (
              <label
                key={item.id}
                htmlFor={providerInputId(item.id)}
                className={cn(
                  'flex min-w-0 cursor-pointer items-center gap-2.5 rounded-xl border bg-card p-2.5 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-offset-2',
                  presetId === item.id
                    ? 'border-primary ring-1 ring-primary'
                    : 'border-border hover:border-foreground/40',
                )}
              >
                <AiProviderIcon preset={item} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <span className="truncate text-sm font-medium">{item.name}</span>
                    {item.featured && (
                      <Badge className="h-4 px-1.5 text-[10px]" variant="secondary">
                        推荐
                      </Badge>
                    )}
                  </span>
                  <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                    {item.vendor} · {item.description}
                  </span>
                </span>
                <RadioGroupItem id={providerInputId(item.id)} value={item.id} />
              </label>
            ))}
            <label
              htmlFor={providerInputId(CUSTOM_PROVIDER_ID)}
              className={cn(
                'flex min-w-0 cursor-pointer items-center gap-2.5 rounded-xl border bg-card p-2.5 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-offset-2',
                isCustomProvider
                  ? 'border-primary ring-1 ring-primary'
                  : 'border-border hover:border-foreground/40',
              )}
            >
              <AiProviderIcon size="sm" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">自定义 / OpenAI 兼容</span>
                <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                  其他国内平台或自建网关
                </span>
              </span>
              <RadioGroupItem
                id={providerInputId(CUSTOM_PROVIDER_ID)}
                value={CUSTOM_PROVIDER_ID}
              />
            </label>
          </RadioGroup>
        </div>

        <Card size="sm">
          <CardContent className="space-y-4">
            <Item className="flex-nowrap border-border bg-muted/40" size="sm" variant="outline">
              <ItemMedia>
                <AiProviderIcon preset={preset} />
              </ItemMedia>
              <ItemContent>
                <ItemTitle>{preset?.name ?? '自定义兼容接口'}</ItemTitle>
                <ItemDescription>
                  {preset
                    ? `${preset.vendor} · 已自动填入接口地址与模型`
                    : '兼容 OpenAI Chat Completions 的任意接口'}
                </ItemDescription>
              </ItemContent>
              <ItemActions>
                <Badge variant="secondary">{draft.model || '未选择模型'}</Badge>
              </ItemActions>
            </Item>

            <FieldGroup className="gap-4">
              <Field>
                <FieldLabel htmlFor="ai-api-key">API Key</FieldLabel>
                <InputGroup>
                  <InputGroupInput
                    id="ai-api-key"
                    type="password"
                    autoComplete="new-password"
                    maxLength={512}
                    value={draft.apiKey ?? ''}
                    placeholder={
                      configured ? '已保存，留空保留；输入新值替换' : '粘贴服务商控制台生成的 API Key'
                    }
                    onChange={(event) => update({ apiKey: event.target.value })}
                  />
                  {preset && (
                    <InputGroupAddon align="inline-end">
                      <a
                        className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                        href={preset.apiKeyUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        获取密钥
                        <ExternalLink className="size-3" />
                      </a>
                    </InputGroupAddon>
                  )}
                </InputGroup>
                <FieldDescription>密钥只提交到后端保存，不会在浏览器回显完整内容。</FieldDescription>
              </Field>

              {isCustomProvider && (
                <Field>
                  <FieldLabel htmlFor="ai-provider">服务商名称</FieldLabel>
                  <Input
                    id="ai-provider"
                    maxLength={80}
                    value={draft.provider}
                    placeholder="例如 硅基流动 / 自建网关"
                    onChange={(event) => update({ provider: event.target.value })}
                  />
                  <FieldDescription>自定义名称仅用于界面展示。</FieldDescription>
                </Field>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="ai-model">默认模型</FieldLabel>
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
                  <FieldDescription>模型版本更新较快，可切换为自定义模型。</FieldDescription>
                </Field>

                <Field>
                  <FieldLabel htmlFor="ai-base-url">接口地址</FieldLabel>
                  <InputGroup>
                    <InputGroupInput
                      id="ai-base-url"
                      type="url"
                      maxLength={1000}
                      value={draft.baseUrl ?? ''}
                      placeholder="https://api.example.com/v1"
                      onChange={(event) => update({ baseUrl: event.target.value })}
                    />
                    {preset && (draft.baseUrl ?? '') !== preset.baseUrl && (
                      <InputGroupAddon align="inline-end">
                        <InputGroupButton
                          aria-label="恢复官方接口地址"
                          size="icon-xs"
                          onClick={() => update({ baseUrl: preset.baseUrl })}
                        >
                          <RotateCcw />
                        </InputGroupButton>
                      </InputGroupAddon>
                    )}
                  </InputGroup>
                  <FieldDescription>系统会自动追加 /chat/completions。</FieldDescription>
                </Field>
              </div>
            </FieldGroup>
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
              <Field>
                <div className="flex items-center justify-between">
                  <FieldLabel htmlFor="ai-temperature">生成温度（Temperature）</FieldLabel>
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
                <FieldDescription>数值越低回答越稳定，数值越高回答越有创造性。</FieldDescription>
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="ai-max-tokens">最大 Token 数</FieldLabel>
                  <Input
                    id="ai-max-tokens"
                    min={256}
                    max={8192}
                    step={256}
                    type="number"
                    value={draft.maxTokens}
                    onChange={(event) => update({ maxTokens: Number(event.target.value) || 0 })}
                  />
                  <FieldDescription>范围 256–8192。</FieldDescription>
                </Field>
                <Field>
                  <FieldLabel htmlFor="ai-language">回复语言</FieldLabel>
                  <LanguageSelect
                    id="ai-language"
                    value={draft.language}
                    onChange={(language) => update({ language })}
                  />
                  <FieldDescription>默认使用简体中文回复。</FieldDescription>
                </Field>
              </div>

              <Field>
                <FieldLabel htmlFor="ai-system-prompt">系统提示词</FieldLabel>
                <Textarea
                  id="ai-system-prompt"
                  className="min-h-24"
                  maxLength={4000}
                  placeholder="定义 AI 助手在工作区中的角色与回复风格"
                  value={draft.systemPrompt}
                  onChange={(event) => update({ systemPrompt: event.target.value })}
                />
                <FieldDescription>将作为每次对话的系统消息发送给模型。</FieldDescription>
              </Field>

              <Separator />

              <div className="space-y-3">
                <div>
                  <h4 className="font-medium">AI 能力</h4>
                  <p className="mt-1 text-xs text-muted-foreground">
                    保存各项功能的启用偏好，具体能力会随功能入口逐步开放。
                  </p>
                </div>
                <ItemGroup className="gap-2">
                  {AI_FEATURES.map((feature) => (
                    <Item key={feature.key} size="sm" variant="muted">
                      <ItemContent>
                        <ItemTitle>{feature.title}</ItemTitle>
                        <ItemDescription>{feature.description}</ItemDescription>
                      </ItemContent>
                      <ItemActions>
                        <Switch
                          checked={draft.features[feature.key]}
                          onCheckedChange={(checked) =>
                            update({ features: { ...draft.features, [feature.key]: checked } })
                          }
                        />
                      </ItemActions>
                    </Item>
                  ))}
                </ItemGroup>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        <div className="flex flex-wrap items-center gap-2">
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
              onClick={() => setClearOpen(true)}
            >
              <Trash2 />
              清除密钥
            </Button>
          )}
        </div>

        <AlertDialog open={clearOpen} onOpenChange={setClearOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia>
              <KeyRound />
            </AlertDialogMedia>
            <AlertDialogTitle>清除已保存的 API Key？</AlertDialogTitle>
            <AlertDialogDescription>
              清除后需要重新填写密钥才能使用 AI 功能，服务商、模型等配置会保留。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy !== null}
              onClick={() => {
                setClearOpen(false);
                void handleClear();
              }}
            >
              清除密钥
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TabsContent>
  );
}
