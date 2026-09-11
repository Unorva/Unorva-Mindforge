import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  Bell,
  Blocks,
  BookOpen,
  Bot,
  Check,
  ClipboardCheck,
  FolderKanban,
  KeyRound,
  Loader2,
  LogOut,
  Mail,
  MonitorSmartphone,
  NotebookText,
  Palette,
  Plus,
  ShieldCheck,
  Star,
  Ticket,
  type LucideIcon,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { useTheme } from '@/context/shadcntheme/ThemeContext';
import { SettingsProvider, useSettings } from '@/context/settings-context';
import Spinner from 'src/views/spinner/Spinner';
import { cn } from '@/lib/utils';
import type {
  AiSettings,
  AppIntegration,
  NotificationSettings,
  SecuritySettings,
} from '@/types/apps/settings';

/** 模拟的模型服务商与可选模型 */
const MODELS_BY_PROVIDER: Record<string, string[]> = {
  OpenAI: ['GPT-4o', 'GPT-4o mini', 'o3-mini'],
  Anthropic: ['Claude Sonnet 4', 'Claude Opus 4', 'Claude Haiku 3.5'],
  通义千问: ['Qwen-Max', 'Qwen-Plus', 'Qwen-Turbo'],
  DeepSeek: ['DeepSeek-Chat', 'DeepSeek-R1'],
  'Ollama 本地': ['Llama 3.1', 'Qwen 2.5', 'Mistral'],
};

const PROVIDERS = Object.keys(MODELS_BY_PROVIDER);
const LANGUAGES = ['简体中文', '英语', '日语'];
const SYNC_FREQUENCIES = ['实时', '每小时', '每天', '手动'] as const;
const SESSION_TIMEOUTS = ['30 分钟', '2 小时', '8 小时', '24 小时'] as const;
const EMAIL_PROVIDERS = ['Gmail', 'Outlook', '企业邮箱', 'QQ 邮箱', '163 邮箱'];
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const APP_ICONS: Record<string, LucideIcon> = {
  projects: FolderKanban,
  mail: Mail,
  'daily-review': ClipboardCheck,
  notes: NotebookText,
  blog: BookOpen,
  tickets: Ticket,
};

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

function SaveBar({
  saving,
  onSave,
}: {
  saving: boolean;
  onSave: () => void;
}) {
  return (
    <div className="flex justify-end border-t pt-5">
      <Button disabled={saving} onClick={onSave}>
        {saving ? <Loader2 className="animate-spin" /> : <Check />}
        保存
      </Button>
    </div>
  );
}

function AccountSettingsContent() {
  const {
    settings,
    loading,
    saveAiSettings,
    saveApps,
    bindEmail,
    verifyEmail,
    setPrimaryEmail,
    unbindEmail,
    saveNotifications,
    saveSecurity,
  } = useSettings();
  const { theme, setTheme } = useTheme();

  const [aiDraft, setAiDraft] = useState<AiSettings | null>(null);
  const [appsDraft, setAppsDraft] = useState<AppIntegration[] | null>(null);
  const [notificationsDraft, setNotificationsDraft] =
    useState<NotificationSettings | null>(null);
  const [securityDraft, setSecurityDraft] = useState<SecuritySettings | null>(null);
  const [savingSection, setSavingSection] = useState<string | null>(null);

  const [newEmail, setNewEmail] = useState('');
  const [newEmailProvider, setNewEmailProvider] = useState<string>(EMAIL_PROVIDERS[0]);
  const [passwordForm, setPasswordForm] = useState({
    current: '',
    next: '',
    confirm: '',
  });

  useEffect(() => {
    if (!settings) return;
    setAiDraft(settings.ai);
    setAppsDraft(settings.apps);
    setNotificationsDraft(settings.notifications);
    setSecurityDraft(settings.security);
  }, [settings]);

  if (loading || !settings || !aiDraft || !appsDraft || !notificationsDraft || !securityDraft) {
    return (
      <div className="flex min-h-64 items-center justify-center">
        <Spinner />
      </div>
    );
  }

  const runSave = async (section: string, request: () => Promise<void>, message: string) => {
    setSavingSection(section);
    try {
      await request();
      toast.success(message);
    } catch {
      // 请求失败时 global-fetcher 已统一弹出错误提示
    } finally {
      setSavingSection(null);
    }
  };

  const handleBindEmail = async () => {
    const email = newEmail.trim();
    if (!EMAIL_PATTERN.test(email)) {
      toast.error('邮箱格式不正确');
      return;
    }
    if (settings.emails.some((item) => item.email.toLowerCase() === email.toLowerCase())) {
      toast.error('该邮箱已绑定');
      return;
    }
    setSavingSection('emails');
    try {
      await bindEmail(email, newEmailProvider);
      toast.success('邮箱绑定成功', { description: '验证邮件已发送（模拟）' });
      setNewEmail('');
    } catch {
      // 错误提示由 global-fetcher 统一处理
    } finally {
      setSavingSection(null);
    }
  };

  const handleChangePassword = () => {
    if (!passwordForm.current || !passwordForm.next || !passwordForm.confirm) {
      toast.error('请填写完整的密码信息');
      return;
    }
    if (passwordForm.next.length < 8) {
      toast.error('新密码至少需要 8 位');
      return;
    }
    if (passwordForm.next !== passwordForm.confirm) {
      toast.error('两次输入的新密码不一致');
      return;
    }
    toast.success('密码修改成功（模拟）');
    setPasswordForm({ current: '', next: '', confirm: '' });
  };

  const handleRevokeSession = (id: number) => {
    setSecurityDraft({
      ...securityDraft,
      activeSessions: securityDraft.activeSessions.filter((session) => session.id !== id),
    });
    toast.success('该设备已下线（模拟）', { description: '点击保存后生效' });
  };

  return (
    <Tabs
      defaultValue="ai"
      orientation="vertical"
      className="flex min-h-0 flex-row gap-0 overflow-hidden"
    >
        <TabsList
          variant="line"
          className="h-auto w-52 shrink-0 flex-col items-stretch justify-start rounded-none border-r bg-muted/30 p-3"
        >
          <TabsTrigger value="ai" className="justify-start gap-2 px-3 py-2">
            <Bot />
            AI 配置
          </TabsTrigger>
          <TabsTrigger value="apps" className="justify-start gap-2 px-3 py-2">
            <Blocks />
            应用配置
          </TabsTrigger>
          <TabsTrigger value="emails" className="justify-start gap-2 px-3 py-2">
            <Mail />
            邮箱绑定
          </TabsTrigger>
          <TabsTrigger value="notifications" className="justify-start gap-2 px-3 py-2">
            <Bell />
            通知设置
          </TabsTrigger>
          <TabsTrigger value="preferences" className="justify-start gap-2 px-3 py-2">
            <Palette />
            外观偏好
          </TabsTrigger>
          <TabsTrigger value="security" className="justify-start gap-2 px-3 py-2">
            <ShieldCheck />
            安全设置
          </TabsTrigger>
        </TabsList>

        {/* AI 配置 */}
        <TabsContent value="ai" className="m-0 min-w-0 flex-1 space-y-6 overflow-y-auto p-6">
          <SectionIntro
            title="AI 配置"
            description="配置工作区默认使用的模型服务商、生成参数与 AI 能力开关（当前为模拟数据）。"
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="ai-provider">模型服务商</Label>
              <OptionSelect
                ariaLabel="模型服务商"
                items={PROVIDERS}
                value={aiDraft.provider}
                onValueChange={(provider) =>
                  setAiDraft({
                    ...aiDraft,
                    provider,
                    model: MODELS_BY_PROVIDER[provider]?.[0] ?? aiDraft.model,
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ai-model">默认模型</Label>
              <OptionSelect
                ariaLabel="默认模型"
                items={MODELS_BY_PROVIDER[aiDraft.provider] ?? []}
                value={aiDraft.model}
                onValueChange={(model) => setAiDraft({ ...aiDraft, model })}
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="ai-temperature">生成温度（Temperature）</Label>
              <span className="text-sm text-muted-foreground">
                {aiDraft.temperature.toFixed(1)}
              </span>
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
              onChange={(event) =>
                setAiDraft({ ...aiDraft, systemPrompt: event.target.value })
              }
            />
          </div>

          <Separator />

          <div className="space-y-3">
            <h4 className="font-medium">AI 能力</h4>
            <Card size="sm">
              <CardContent className="space-y-4">
                <SettingRow
                  title="智能摘要"
                  description="自动为邮件、笔记和工单生成摘要。"
                >
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
                <SettingRow
                  title="自动标签"
                  description="根据内容为笔记和邮件自动打标签。"
                >
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
                  description="每晚根据当日任务与邮件自动生成复盘草稿。"
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
                  description="在邮件中心提供 AI 续写、润色与翻译。"
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

          <SaveBar
            saving={savingSection === 'ai'}
            onSave={() => runSave('ai', () => saveAiSettings(aiDraft), 'AI 配置已保存')}
          />
        </TabsContent>

        {/* 应用配置 */}
        <TabsContent value="apps" className="m-0 min-w-0 flex-1 space-y-6 overflow-y-auto p-6">
          <SectionIntro
            title="应用配置"
            description="启用或关闭各个 APP，并按需配置同步频率、通知与 AI 辅助（当前为模拟数据）。"
          />

          <div className="grid gap-4 lg:grid-cols-2">
            {appsDraft.map((app) => {
              const AppIcon = APP_ICONS[app.id] ?? Blocks;
              return (
                <Card key={app.id} size="sm">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <AppIcon className="size-4" />
                        </span>
                        <div>
                          <CardTitle>{app.name}</CardTitle>
                          <CardDescription className="mt-1">
                            {app.description}
                          </CardDescription>
                        </div>
                      </div>
                      <Switch
                        checked={app.enabled}
                        onCheckedChange={(enabled) =>
                          setAppsDraft(
                            appsDraft.map((item) =>
                              item.id === app.id ? { ...item, enabled } : item
                            )
                          )
                        }
                      />
                    </div>
                  </CardHeader>
                  {app.enabled && (
                    <CardContent className="space-y-4 border-t pt-3">
                      <SettingRow
                        title="同步频率"
                        description="数据与应用间的同步节奏。"
                      >
                        <OptionSelect
                          ariaLabel={`${app.name} 同步频率`}
                          className="w-32"
                          items={SYNC_FREQUENCIES}
                          value={app.options.syncFrequency}
                          onValueChange={(syncFrequency) =>
                            setAppsDraft(
                              appsDraft.map((item) =>
                                item.id === app.id
                                  ? {
                                      ...item,
                                      options: { ...item.options, syncFrequency },
                                    }
                                  : item
                              )
                            )
                          }
                        />
                      </SettingRow>
                      <SettingRow
                        title="应用内通知"
                        description="该应用有新动态时推送通知。"
                      >
                        <Switch
                          checked={app.options.notify}
                          onCheckedChange={(notify) =>
                            setAppsDraft(
                              appsDraft.map((item) =>
                                item.id === app.id
                                  ? { ...item, options: { ...item.options, notify } }
                                  : item
                              )
                            )
                          }
                        />
                      </SettingRow>
                      <SettingRow
                        title="AI 辅助"
                        description="允许 AI 在该应用中提供建议与自动化。"
                      >
                        <Switch
                          checked={app.options.aiAssist}
                          onCheckedChange={(aiAssist) =>
                            setAppsDraft(
                              appsDraft.map((item) =>
                                item.id === app.id
                                  ? { ...item, options: { ...item.options, aiAssist } }
                                  : item
                              )
                            )
                          }
                        />
                      </SettingRow>
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>

          <SaveBar
            saving={savingSection === 'apps'}
            onSave={() => runSave('apps', () => saveApps(appsDraft), '应用配置已保存')}
          />
        </TabsContent>

        {/* 邮箱绑定 */}
        <TabsContent value="emails" className="m-0 min-w-0 flex-1 space-y-6 overflow-y-auto p-6">
          <SectionIntro
            title="邮箱绑定"
            description="绑定多个邮箱账号，用于邮件中心聚合与系统通知（当前为模拟数据）。"
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
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={savingSection === 'emails'}
                        onClick={() =>
                          runSave(
                            'emails',
                            () => verifyEmail(binding.id),
                            '邮箱验证成功（模拟）'
                          )
                        }
                      >
                        验证
                      </Button>
                    )}
                    {!binding.isPrimary && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={savingSection === 'emails'}
                        onClick={() =>
                          runSave(
                            'emails',
                            () => setPrimaryEmail(binding.id),
                            '已切换主要邮箱'
                          )
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
                        runSave(
                          'emails',
                          () => unbindEmail(binding.id),
                          `已解绑 ${binding.email}`
                        )
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

        {/* 通知设置 */}
        <TabsContent value="notifications" className="m-0 min-w-0 flex-1 space-y-6 overflow-y-auto p-6">
          <SectionIntro
            title="通知设置"
            description="控制系统通知的接收渠道与各类事件的提醒开关（当前为模拟数据）。"
          />

          <Card size="sm">
            <CardContent className="space-y-4">
              <SettingRow
                title="邮件通知"
                description="通过主要邮箱接收系统通知。"
              >
                <Switch
                  checked={notificationsDraft.emailNotifications}
                  onCheckedChange={(emailNotifications) =>
                    setNotificationsDraft({ ...notificationsDraft, emailNotifications })
                  }
                />
              </SettingRow>
              <SettingRow
                title="站内通知"
                description="在顶栏通知中心展示未读消息。"
              >
                <Switch
                  checked={notificationsDraft.inAppNotifications}
                  onCheckedChange={(inAppNotifications) =>
                    setNotificationsDraft({ ...notificationsDraft, inAppNotifications })
                  }
                />
              </SettingRow>
              <SettingRow
                title="每日复盘提醒"
                description="每晚提醒完成当日复盘。"
              >
                <Switch
                  checked={notificationsDraft.dailyReviewReminder}
                  onCheckedChange={(dailyReviewReminder) =>
                    setNotificationsDraft({ ...notificationsDraft, dailyReviewReminder })
                  }
                />
              </SettingRow>
              <SettingRow
                title="项目动态"
                description="项目状态、需求与缺陷变更时提醒。"
              >
                <Switch
                  checked={notificationsDraft.projectUpdates}
                  onCheckedChange={(projectUpdates) =>
                    setNotificationsDraft({ ...notificationsDraft, projectUpdates })
                  }
                />
              </SettingRow>
              <SettingRow
                title="工单动态"
                description="工单创建、分派与关闭时提醒。"
              >
                <Switch
                  checked={notificationsDraft.ticketUpdates}
                  onCheckedChange={(ticketUpdates) =>
                    setNotificationsDraft({ ...notificationsDraft, ticketUpdates })
                  }
                />
              </SettingRow>
              <SettingRow
                title="AI 周报"
                description="每周一发送上周 AI 使用情况汇总。"
              >
                <Switch
                  checked={notificationsDraft.aiWeeklyReport}
                  onCheckedChange={(aiWeeklyReport) =>
                    setNotificationsDraft({ ...notificationsDraft, aiWeeklyReport })
                  }
                />
              </SettingRow>
            </CardContent>
          </Card>

          <SaveBar
            saving={savingSection === 'notifications'}
            onSave={() =>
              runSave(
                'notifications',
                () => saveNotifications(notificationsDraft),
                '通知设置已保存'
              )
            }
          />
        </TabsContent>

        {/* 外观偏好 */}
        <TabsContent value="preferences" className="m-0 min-w-0 flex-1 space-y-6 overflow-y-auto p-6">
          <SectionIntro
            title="外观偏好"
            description="这些偏好仅影响当前浏览器中的使用体验。"
          />

          <Card size="sm">
            <CardHeader>
              <CardTitle>主题模式</CardTitle>
              <CardDescription>选择界面的显示模式，立即生效。</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {(['system', 'light', 'dark'] as const).map((option) => (
                <Button
                  key={option}
                  variant={theme === option ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTheme(option)}
                >
                  {{ system: '跟随系统', light: '浅色', dark: '深色' }[option]}
                </Button>
              ))}
            </CardContent>
          </Card>

          <Card size="sm">
            <CardContent>
              <SettingRow
                title="紧凑模式"
                description="缩小间距与控件尺寸，在单屏展示更多内容。"
              >
                <Switch
                  checked={false}
                  onCheckedChange={() =>
                    toast.info('紧凑模式即将上线', {
                      description: '当前版本暂未开放该偏好。',
                    })
                  }
                />
              </SettingRow>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 安全设置 */}
        <TabsContent value="security" className="m-0 min-w-0 flex-1 space-y-6 overflow-y-auto p-6">
          <SectionIntro
            title="安全设置"
            description="管理账号安全策略、登录会话与密码（当前为模拟数据）。"
          />

          <Card size="sm">
            <CardContent className="space-y-4">
              <SettingRow
                title="两步验证"
                description="登录时需要输入邮箱或验证器动态验证码。"
              >
                <Switch
                  checked={securityDraft.twoFactor}
                  onCheckedChange={(twoFactor) =>
                    setSecurityDraft({ ...securityDraft, twoFactor })
                  }
                />
              </SettingRow>
              <SettingRow
                title="登录提醒"
                description="新设备登录时向主要邮箱发送提醒。"
              >
                <Switch
                  checked={securityDraft.loginAlerts}
                  onCheckedChange={(loginAlerts) =>
                    setSecurityDraft({ ...securityDraft, loginAlerts })
                  }
                />
              </SettingRow>
              <SettingRow
                title="会话超时"
                description="无操作超过该时长后自动退出登录。"
              >
                <OptionSelect
                  ariaLabel="会话超时"
                  className="w-32"
                  items={SESSION_TIMEOUTS}
                  value={securityDraft.sessionTimeout}
                  onValueChange={(sessionTimeout) =>
                    setSecurityDraft({ ...securityDraft, sessionTimeout })
                  }
                />
              </SettingRow>
            </CardContent>
          </Card>

          <Card size="sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MonitorSmartphone className="size-4" />
                活跃会话
              </CardTitle>
              <CardDescription>当前登录过账号的设备列表。</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {securityDraft.activeSessions.map((session) => (
                <div
                  key={session.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{session.device}</p>
                      {session.current && <Badge variant="secondary">当前</Badge>}
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {session.location} · {session.lastActive}
                    </p>
                  </div>
                  {!session.current && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRevokeSession(session.id)}
                    >
                      <LogOut />
                      下线
                    </Button>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          <Card size="sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <KeyRound className="size-4" />
                修改密码
              </CardTitle>
              <CardDescription>建议定期更换密码以提升账号安全性。</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="current-password">当前密码</Label>
                  <Input
                    id="current-password"
                    type="password"
                    placeholder="输入当前密码"
                    value={passwordForm.current}
                    onChange={(event) =>
                      setPasswordForm({ ...passwordForm, current: event.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-password">新密码</Label>
                  <Input
                    id="new-password"
                    type="password"
                    placeholder="至少 8 位"
                    value={passwordForm.next}
                    onChange={(event) =>
                      setPasswordForm({ ...passwordForm, next: event.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">确认新密码</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    placeholder="再次输入新密码"
                    value={passwordForm.confirm}
                    onChange={(event) =>
                      setPasswordForm({ ...passwordForm, confirm: event.target.value })
                    }
                  />
                </div>
              </div>
              <div className="mt-4 flex justify-end">
                <Button variant="outline" onClick={handleChangePassword}>
                  <KeyRound />
                  修改密码
                </Button>
              </div>
            </CardContent>
          </Card>

          <SaveBar
            saving={savingSection === 'security'}
            onSave={() =>
              runSave(
                'security',
                () => saveSecurity(securityDraft),
                '安全设置已保存'
              )
            }
          />
        </TabsContent>
    </Tabs>
  );
}

interface AccountSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * 账户设置弹窗：由顶部头像菜单中的 Account Settings 打开，
 * 自带 SettingsProvider，数据全部来自 MSW 模拟接口。
 */
const AccountSettingsDialog = ({ open, onOpenChange }: AccountSettingsDialogProps) => (
  <SettingsProvider>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="grid-rows-[auto_minmax(0,1fr)] gap-0 overflow-hidden p-0 h-[min(56rem,calc(100vh-2rem))]"
        style={{
          width: 'calc(100vw - 2rem)',
          maxWidth: '64rem',
        }}
      >
        <DialogHeader className="border-b px-6 py-5 pr-14">
          <DialogTitle className="text-lg">账户设置</DialogTitle>
          <DialogDescription>
            管理 AI 配置、应用集成、邮箱绑定与账号安全等系统设置（当前为模拟数据）。
          </DialogDescription>
        </DialogHeader>
        <AccountSettingsContent />
      </DialogContent>
    </Dialog>
  </SettingsProvider>
);

export default AccountSettingsDialog;
