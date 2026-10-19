import { useEffect, useState, type ReactNode } from 'react';
import { deleteFetcher, postFetcher } from '@/api/global-fetcher';
import { toast } from '@/components/ui/toast';
import { Bot, Check, Loader2, Mail, Plus, Star } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { SettingsProvider, useSettings } from '@/context/settings-context';
import Spinner from 'src/views/spinner/Spinner';
import { cn } from '@/lib/utils';
import type { AiSettings } from '@/types/apps/settings';

const LANGUAGES = ['简体中文', '英语', '日语'];
const EMAIL_PROVIDERS = ['Gmail', 'Outlook', '企业邮箱', 'QQ 邮箱', '163 邮箱'];
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function OptionSelect<T extends string>({
  ariaLabel,
  className,
  disabled = false,
  items,
  onValueChange,
  value,
}: {
  ariaLabel: string;
  className?: string;
  disabled?: boolean;
  items: readonly T[];
  onValueChange: (value: T) => void;
  value: T;
}) {
  return (
    <Select
      disabled={disabled}
      value={value}
      onValueChange={(nextValue) => nextValue && onValueChange(nextValue as T)}
    >
      <SelectTrigger aria-label={ariaLabel} className={cn('w-full cursor-pointer', className)}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {items.map((item) => (
          <SelectItem className="cursor-pointer" key={item} value={item}>
            {item}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function SectionIntro({ title, description }: { title: string; description: string }) {
  return (
    <div>
      <h3 className="text-base font-medium">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function SettingRow({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <p className="font-medium">{title}</p>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      {children}
    </div>
  );
}

function SaveBar({ saving, onSave }: { saving: boolean; onSave: () => void }) {
  return (
    <div className="flex justify-end border-t pt-5">
      <Button disabled={saving} onClick={onSave}>
        {saving ? <Loader2 className="animate-spin" /> : <Check />}
        保存
      </Button>
    </div>
  );
}

const SETTINGS_TABS = [
  { value: 'ai', label: 'AI 配置', icon: Bot },
  { value: 'mail', label: '邮箱', icon: Mail },
];

function AccountSettingsTabs({
  initialTab,
  children,
}: {
  initialTab?: 'ai' | 'mail';
  children?: ReactNode;
}) {
  return (
    <Tabs
      defaultValue={initialTab ?? 'ai'}
      orientation="vertical"
      className="grid min-h-0 grid-cols-[3.5rem_minmax(0,1fr)] gap-0 overflow-hidden sm:grid-cols-[10rem_minmax(0,1fr)] md:grid-cols-[11rem_minmax(0,1fr)]"
    >
      <TabsList className="h-auto! w-full shrink-0 flex-col! items-stretch! justify-start! gap-1 overflow-y-auto rounded-none border-r bg-muted/30 p-2">
        {SETTINGS_TABS.map(({ value, label, icon: TabIcon }) => (
          <TabsTrigger
            key={value}
            aria-label={label}
            value={value}
            className="h-10! w-full! flex-none justify-center gap-0 rounded-lg px-0 py-2 after:hidden hover:bg-muted/60 data-active:bg-muted data-active:shadow-none sm:justify-start sm:gap-2 sm:px-3"
          >
            <TabIcon />
            <span className="sr-only sm:not-sr-only">{label}</span>
          </TabsTrigger>
        ))}
      </TabsList>
      {children}
    </Tabs>
  );
}

function AccountSettingsContent({ initialTab = 'ai' }: { initialTab?: 'ai' | 'mail' }) {
  const { settings, loading, error, saveAiSettings, bindEmail, setPrimaryEmail, unbindEmail } =
    useSettings();

  const [aiDraft, setAiDraft] = useState<AiSettings | null>(null);
  const [savingSection, setSavingSection] = useState<string | null>(null);

  const [newEmail, setNewEmail] = useState('');
  const [newEmailProvider, setNewEmailProvider] = useState<string>(EMAIL_PROVIDERS[0]);
  useEffect(() => {
    if (!settings) return;
    setAiDraft(settings.ai);
  }, [settings]);

  if (error) {
    return (
      <AccountSettingsTabs initialTab={initialTab}>
        <TabsContent value="ai" className="m-0 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3 px-6 text-center">
            <p className="font-medium">AI 配置加载失败</p>
            <p className="max-w-md text-sm text-muted-foreground">
              请重新打开设置；如果问题持续，请检查后端服务是否正常启动。
            </p>
          </div>
        </TabsContent>
        <TabsContent value="mail" className="m-0 flex items-center justify-center">
          <p className="px-6 text-center text-muted-foreground">
            账户设置加载失败，请重新打开设置。
          </p>
        </TabsContent>
      </AccountSettingsTabs>
    );
  }

  if (loading || !settings || !aiDraft) {
    return (
      <AccountSettingsTabs initialTab={initialTab}>
        <TabsContent value="ai" className="m-0 flex items-center justify-center">
          <Spinner />
        </TabsContent>
        <TabsContent value="mail" className="m-0 flex items-center justify-center">
          <Spinner />
        </TabsContent>
      </AccountSettingsTabs>
    );
  }

  const runSave = async (section: string, request: () => Promise<void>, message: string) => {
    if (savingSection) return;
    setSavingSection(section);
    try {
      await request();
      toast.add({ type: 'success', title: message });
    } catch {
      // 请求失败时 global-fetcher 已统一弹出错误提示
    } finally {
      setSavingSection(null);
    }
  };

  const handleSaveAi = async () => {
    const baseUrl = aiDraft.baseUrl?.trim() ?? '';
    let validUrl = false;
    try {
      validUrl = ['http:', 'https:'].includes(new URL(baseUrl).protocol);
    } catch {
      /* 输入尚未构成完整 URL。 */
    }
    if (
      !validUrl ||
      !aiDraft.provider.trim() ||
      !aiDraft.model.trim() ||
      aiDraft.maxTokens < 256 ||
      aiDraft.maxTokens > 32768 ||
      !Number.isInteger(aiDraft.maxTokens)
    ) {
      toast.add({
        type: 'error',
        title: '请填写有效的接口地址、服务商、模型与 256–32768 的整数 Token 限制',
      });
      return;
    }
    await runSave(
      'ai',
      () =>
        saveAiSettings({
          ...aiDraft,
          baseUrl,
          model: aiDraft.model.trim(),
          provider: aiDraft.provider.trim(),
        }),
      'AI 配置已保存',
    );
  };

  const handleBindEmail = async () => {
    const email = newEmail.trim();
    if (!EMAIL_PATTERN.test(email)) {
      toast.add({ type: 'error', title: '邮箱格式不正确' });
      return;
    }
    if (settings.emails.some((item) => item.email.toLowerCase() === email.toLowerCase())) {
      toast.add({ type: 'error', title: '该邮箱已绑定' });
      return;
    }
    setSavingSection('emails');
    try {
      await bindEmail(email, newEmailProvider);
      toast.add({
        type: 'success',
        title: '邮箱记录已保存',
        description: '外部邮箱验证服务尚未接入。',
      });
      setNewEmail('');
    } catch {
      // 错误提示由 global-fetcher 统一处理
    } finally {
      setSavingSection(null);
    }
  };

  return (
    <AccountSettingsTabs initialTab={initialTab}>
      {/* AI 配置 */}
      <TabsContent
        value="ai"
        className="m-0 min-h-0 min-w-0 flex-1 space-y-6 overflow-y-auto p-4 pr-10 sm:p-6 sm:pr-12"
      >
        <SectionIntro
          title="AI 配置"
          description="连接兼容 OpenAI Chat Completions 标准的接口。先保存配置，再测试连接。"
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="ai-provider">模型服务商</Label>
            <Input
              id="ai-provider"
              maxLength={100}
              value={aiDraft.provider}
              onChange={(event) => setAiDraft({ ...aiDraft, provider: event.target.value })}
              placeholder="例如 OpenAI / DeepSeek / 本地服务"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ai-model">默认模型</Label>
            <Input
              id="ai-model"
              maxLength={100}
              value={aiDraft.model}
              onChange={(event) => setAiDraft({ ...aiDraft, model: event.target.value })}
              placeholder="输入接口支持的模型 ID"
            />
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ai-base-url">接口基础地址</Label>
            <Input
              id="ai-base-url"
              type="url"
              maxLength={1000}
              value={aiDraft.baseUrl ?? ''}
              placeholder="https://api.example.com/v1"
              onChange={(event) => setAiDraft({ ...aiDraft, baseUrl: event.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              包含 /v1（如服务要求），系统会追加 /chat/completions。
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="ai-api-key">API Key</Label>
            <Input
              id="ai-api-key"
              type="password"
              autoComplete="new-password"
              maxLength={2000}
              value={aiDraft.apiKey ?? ''}
              placeholder={
                settings.ai.configured ? '已保存密钥，留空保留；输入新值替换' : '输入服务密钥'
              }
              onChange={(event) => setAiDraft({ ...aiDraft, apiKey: event.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              密钥只提交到后端，不会返回完整密钥或保存在浏览器。
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="secondary">{settings.ai.configured ? '已配置' : '未配置'}</Badge>
            <Button
              disabled={savingSection !== null || !settings.ai.configured}
              variant="outline"
              onClick={() =>
                void runSave(
                  'ai-test',
                  async () => {
                    const result = await postFetcher('/ai/test');
                    toast.add({ type: 'info', title: result.data.message || '接口连接正常' });
                  },
                  '连接测试完成',
                )
              }
            >
              {savingSection === 'ai-test' ? '测试中…' : '测试已保存的连接'}
            </Button>
            <Button
              disabled={savingSection !== null || !settings.ai.configured}
              variant="outline"
              onClick={() =>
                void runSave(
                  'ai-clear',
                  async () => {
                    await deleteFetcher('/api/data/settings/ai/credentials');
                    await saveAiSettings({ ...settings.ai, apiKey: '' });
                  },
                  'AI 密钥已清除',
                )
              }
            >
              清除已保存密钥
            </Button>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="ai-temperature">生成温度（Temperature）</Label>
            <span className="text-sm text-muted-foreground">{aiDraft.temperature.toFixed(1)}</span>
          </div>
          <Slider
            id="ai-temperature"
            max={2}
            min={0}
            step={0.1}
            value={aiDraft.temperature}
            onValueChange={(value) =>
              setAiDraft({
                ...aiDraft,
                temperature: Array.isArray(value) ? value[0] : value,
              })
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
              max={32768}
              step={256}
              type="number"
              value={aiDraft.maxTokens}
              onChange={(event) =>
                setAiDraft({
                  ...aiDraft,
                  maxTokens: Number(event.target.value) || 0,
                })
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ai-language">回复语言</Label>
            <OptionSelect
              ariaLabel="回复语言"
              items={LANGUAGES}
              value={aiDraft.language}
              onValueChange={(language) => setAiDraft({ ...aiDraft, language })}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="ai-system-prompt">系统提示词</Label>
          <Textarea
            id="ai-system-prompt"
            className="min-h-28"
            maxLength={500}
            placeholder="定义 AI 助手在工作区中的角色与回复风格"
            value={aiDraft.systemPrompt}
            onChange={(event) => setAiDraft({ ...aiDraft, systemPrompt: event.target.value })}
          />
        </div>

        <Separator />

        <div className="space-y-3">
          <h4 className="font-medium">AI 能力</h4>
          <Card size="sm">
            <CardContent className="space-y-4">
              <SettingRow title="智能摘要" description="保存智能摘要偏好；自动执行尚未配置。">
                <Switch
                  checked={aiDraft.features.smartSummary}
                  onCheckedChange={(smartSummary) =>
                    setAiDraft({
                      ...aiDraft,
                      features: { ...aiDraft.features, smartSummary },
                    })
                  }
                />
              </SettingRow>
              <SettingRow title="自动标签" description="保存自动标签偏好；自动执行尚未配置。">
                <Switch
                  checked={aiDraft.features.autoTag}
                  onCheckedChange={(autoTag) =>
                    setAiDraft({
                      ...aiDraft,
                      features: { ...aiDraft.features, autoTag },
                    })
                  }
                />
              </SettingRow>
              <SettingRow
                title="每日复盘草稿"
                description="保存草稿生成偏好；可在复盘报告中手动生成 AI 总结。"
              >
                <Switch
                  checked={aiDraft.features.dailyReviewDraft}
                  onCheckedChange={(dailyReviewDraft) =>
                    setAiDraft({
                      ...aiDraft,
                      features: { ...aiDraft.features, dailyReviewDraft },
                    })
                  }
                />
              </SettingRow>
              <SettingRow
                title="邮件写作助手"
                description="保存邮件写作偏好；当前可通过 AI 助手撰写正文。"
              >
                <Switch
                  checked={aiDraft.features.emailComposeAssist}
                  onCheckedChange={(emailComposeAssist) =>
                    setAiDraft({
                      ...aiDraft,
                      features: { ...aiDraft.features, emailComposeAssist },
                    })
                  }
                />
              </SettingRow>
            </CardContent>
          </Card>
        </div>

        <SaveBar saving={savingSection === 'ai'} onSave={() => void handleSaveAi()} />
      </TabsContent>

      {/* 邮箱绑定 */}
      <TabsContent
        value="mail"
        className="m-0 min-h-0 min-w-0 flex-1 space-y-6 overflow-y-auto p-4 pr-10 sm:p-6 sm:pr-12"
      >
        <SectionIntro
          title="邮箱"
          description="保存常用邮箱地址与主邮箱偏好。外部邮件收发及邮箱验证尚未接入。"
        />

        <div className="space-y-3">
          {settings.emails.map((binding) => (
            <Card key={binding.id} size="sm">
              <CardContent className="flex flex-wrap items-center gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Mail className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate font-medium">{binding.email}</p>
                    {binding.isPrimary && (
                      <Badge variant="default">
                        <Star />
                        主要邮箱
                      </Badge>
                    )}
                    <Badge variant={binding.verified ? 'secondary' : 'destructive'}>
                      {binding.verified ? '已验证' : '未验证'}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {binding.provider} · 绑定于 {binding.boundAt}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {!binding.verified && (
                    <Button size="sm" variant="outline" disabled>
                      验证未接入
                    </Button>
                  )}
                  {!binding.isPrimary && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={savingSection === 'emails'}
                      onClick={() =>
                        runSave('emails', () => setPrimaryEmail(binding.id), '已切换主要邮箱')
                      }
                    >
                      设为主要
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={binding.isPrimary || savingSection === 'emails'}
                    onClick={() =>
                      runSave('emails', () => unbindEmail(binding.id), `已解绑 ${binding.email}`)
                    }
                  >
                    解绑
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card size="sm">
          <CardHeader>
            <CardTitle>绑定新邮箱</CardTitle>
            <CardDescription>
              绑定后可在邮件中心统一收取，并通过该邮箱接收系统通知。
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="flex-1 space-y-2">
                <Label htmlFor="new-email">邮箱地址</Label>
                <Input
                  id="new-email"
                  placeholder="name@example.com"
                  type="email"
                  value={newEmail}
                  onChange={(event) => setNewEmail(event.target.value)}
                />
              </div>
              <div className="w-full space-y-2 sm:w-44">
                <Label htmlFor="new-email-provider">邮箱类型</Label>
                <OptionSelect
                  ariaLabel="邮箱类型"
                  items={EMAIL_PROVIDERS}
                  value={newEmailProvider}
                  onValueChange={setNewEmailProvider}
                />
              </div>
              <Button
                className="shrink-0"
                disabled={savingSection === 'emails' || !newEmail.trim()}
                onClick={handleBindEmail}
              >
                <Plus />
                绑定邮箱
              </Button>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </AccountSettingsTabs>
  );
}

interface AccountSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialTab?: 'ai' | 'mail';
}

/**
 * 账户设置弹窗：由顶部头像菜单中的 Account Settings 打开，
 * 自带 SettingsProvider，读写后端保存的个人账户设置。
 */
const AccountSettingsDialog = ({ open, onOpenChange, initialTab }: AccountSettingsDialogProps) => {
  if (!open) return null;

  return (
    <SettingsProvider>
      <Dialog open onOpenChange={onOpenChange}>
        <DialogContent
          className="grid-rows-1 gap-0 overflow-hidden p-0 h-[min(42rem,calc(100dvh-2rem))]"
          style={{
            width: 'calc(100vw - 2rem)',
            maxWidth: '70rem',
          }}
        >
          <DialogTitle className="sr-only">账户设置</DialogTitle>
          <DialogDescription className="sr-only">管理 AI 接口与邮箱账户。</DialogDescription>
          <AccountSettingsContent initialTab={initialTab} />
        </DialogContent>
      </Dialog>
    </SettingsProvider>
  );
};

export default AccountSettingsDialog;
