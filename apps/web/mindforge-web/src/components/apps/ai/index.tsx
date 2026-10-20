import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { ArrowUp, CalendarClock, History, MessageCircle, Plus, Puzzle, Trash2 } from 'lucide-react';
import { AiAvatar, useAiAvatarController } from '@/components/ai-avatar';
import {
  createConversation,
  deleteConversation,
  getAiConfig,
  getConversations,
  getMessages,
  sendMessage,
  type AiConfig,
  type ChatMessage,
  type Conversation,
} from '@/api/ai/ai';
import { APP_WORKSPACE_HEIGHT_CLASS } from '@/components/shared/app-workspace';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from '@/components/ui/input-group';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { toast } from '@/components/ui/toast';
import AutomationDialog from './automation-dialog';
import MarketDialog from './market-dialog';

function conversationTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('zh-CN', { month: 'numeric', day: 'numeric' }).format(date);
}

export default function AiAssistant() {
  const avatar = useAiAvatarController('idle');
  const [config, setConfig] = useState<AiConfig | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [composer, setComposer] = useState('');
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historySelection, setHistorySelection] = useState('');
  const [marketOpen, setMarketOpen] = useState(false);
  const [automationOpen, setAutomationOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [responding, setResponding] = useState(false);
  const [messageLoading, setMessageLoading] = useState(false);
  const [error, setError] = useState('');
  const requestId = useRef(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [configuration, history] = await Promise.all([getAiConfig(), getConversations()]);
      setConfig(configuration.data);
      setConversations(history.data);
      setError('');
    } catch {
      setError('AI 服务信息加载失败，请重试。');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, responding]);

  const selectConversation = async (id: number) => {
    if (responding) return;
    const currentRequest = ++requestId.current;
    setActiveId(id);
    setHistoryOpen(false);
    setMessageLoading(true);
    setMessages([]);
    try {
      const result = await getMessages(id);
      if (currentRequest === requestId.current) setMessages(result.data);
    } catch {
      setError('对话加载失败，请重新选择。');
    } finally {
      if (currentRequest === requestId.current) setMessageLoading(false);
    }
  };

  const send = async () => {
    const submittedComposer = composer;
    const content = submittedComposer.trim();
    if (!content || responding || !config?.configured || messageLoading) return;
    setResponding(true);
    setError('');
    avatar.play({ expression: 'thinking', intensity: 0.85 });
    let conversationId = activeId;
    try {
      if (conversationId === null) {
        const created = await createConversation(content.slice(0, 100));
        conversationId = created.data.id;
        setActiveId(conversationId);
        setConversations((items) => [created.data, ...items]);
      }
      const result = await sendMessage(conversationId, content);
      setMessages((items) => [...items, result.data.userMessage, result.data.assistantMessage]);
      setConversations((items) => [
        result.data.conversation,
        ...items.filter((item) => item.id !== conversationId),
      ]);
      setComposer((current) => (current === submittedComposer ? '' : current));
      avatar.play({ expression: 'success', intensity: 0.8, durationMs: 2400, returnTo: 'idle' });
    } catch {
      setError('回复生成失败，输入已保留，可重试。');
      if (conversationId !== null) {
        try {
          setMessages((await getMessages(conversationId)).data);
        } catch {
          /* 请求层已提示加载失败。 */
        }
      }
      avatar.play({ expression: 'error', intensity: 0.7, durationMs: 2400, returnTo: 'idle' });
    } finally {
      setResponding(false);
    }
  };

  const remove = async (id: number) => {
    if (responding) return;
    try {
      await deleteConversation(id);
      setConversations((items) => items.filter((item) => item.id !== id));
      if (activeId === id) {
        ++requestId.current;
        setActiveId(null);
        setMessages([]);
      }
    } catch {
      setError('删除对话失败，请重试。');
    }
  };

  return (
    <section className={cn(APP_WORKSPACE_HEIGHT_CLASS, 'flex min-h-0 flex-col overflow-hidden')}>
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 py-2">
        <span className="truncate text-sm text-muted-foreground">
          {loading
            ? '加载 AI 配置…'
            : config?.configured
              ? `${config.provider} · ${config.model}`
              : '尚未配置 AI 服务'}
        </span>
        <div className="flex w-full flex-wrap gap-2 sm:w-auto">
          <Button
            onClick={() => setMarketOpen(true)}
            variant="outline"
            aria-haspopup="dialog"
            aria-expanded={marketOpen}
          >
            <Puzzle />
            插件
          </Button>
          <Button
            onClick={() => setAutomationOpen(true)}
            variant="outline"
            aria-haspopup="dialog"
            aria-expanded={automationOpen}
          >
            <CalendarClock />
            自动化任务
          </Button>
          <Button onClick={() => setHistoryOpen(true)} variant="outline">
            <History />
            历史记录
          </Button>
          <Button
            disabled={responding}
            onClick={() => {
              ++requestId.current;
              setActiveId(null);
              setMessages([]);
              setComposer('');
              setMessageLoading(false);
              avatar.reset();
            }}
          >
            <Plus />
            新对话
          </Button>
        </div>
      </div>
      <MarketDialog
        open={marketOpen}
        onOpenChange={setMarketOpen}
        skillDisabled={responding}
        onUseSkill={(prompt) => {
          const next = composer.trim() ? `${composer}\n\n${prompt}` : prompt;
          if (next.length > 10000) {
            toast.add({
              type: 'error',
              title: '无法添加技能提示词',
              description: '输入内容将超过 10000 字，请精简后重试。',
            });
            return;
          }
          setComposer(next);
          requestAnimationFrame(() => composerRef.current?.focus());
        }}
      />
      {automationOpen && (
        <AutomationDialog open={automationOpen} onOpenChange={setAutomationOpen} />
      )}
      {!loading && !config?.configured && (
        <p className="rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground">
          请点击右上角头像，在头像侧边栏的“账户设置”中配置兼容 OpenAI 的接口地址、模型和 API Key
          后使用对话。会话历史仍可查看。
        </p>
      )}
      {error && (
        <div
          className="flex items-center justify-between gap-2 py-2 text-sm text-destructive"
          role="alert"
        >
          <span>{error}</span>
          <Button onClick={() => void load()} size="sm" variant="outline">
            重新加载
          </Button>
        </div>
      )}
      <CommandDialog
        className="sm:max-w-lg"
        description="搜索并打开已保存的对话，选中后按 Delete 可删除"
        open={historyOpen}
        title="对话历史"
        onOpenChange={setHistoryOpen}
      >
        <Command
          value={historySelection}
          onValueChange={setHistorySelection}
          onKeyDown={(event: KeyboardEvent<HTMLDivElement>) => {
            const focused = event.target;
            if (focused instanceof HTMLInputElement && focused.value) return;
            if (event.key !== 'Delete' || responding) return;
            const target = conversations.find(
              (item) => `${item.title} ${item.id}` === historySelection,
            );
            if (!target) return;
            event.preventDefault();
            setHistorySelection('');
            void remove(target.id);
          }}
        >
          <CommandInput placeholder="搜索对话标题…" />
          <CommandList>
            <CommandEmpty>
              {conversations.length ? '没有找到匹配的对话' : '还没有对话，开始你的第一个问题。'}
            </CommandEmpty>
            <CommandGroup heading="最近对话">
              {conversations.map((item) => (
                <CommandItem
                  className="group/conversation"
                  disabled={responding}
                  key={item.id}
                  value={`${item.title} ${item.id}`}
                  onSelect={() => void selectConversation(item.id)}
                >
                  <MessageCircle
                    className={cn(
                      'size-4',
                      item.id === activeId ? 'text-primary' : 'text-muted-foreground',
                    )}
                  />
                  <span className="min-w-0 flex-1 truncate">{item.title}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {conversationTime(item.updatedAt)}
                  </span>
                  <button
                    aria-label={`删除 ${item.title}`}
                    className="rounded p-0.5 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover/conversation:opacity-100 focus-visible:opacity-100"
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      setHistorySelection('');
                      void remove(item.id);
                    }}
                    onPointerDown={(event) => event.stopPropagation()}
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </CommandDialog>
      <ScrollArea className="min-h-0 flex-1">
        {messages.length || responding || messageLoading ? (
          <div className="mx-auto max-w-3xl space-y-5 px-4 py-6">
            {messageLoading && <p className="text-sm text-muted-foreground">正在加载消息…</p>}
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn('flex items-start gap-3', message.role === 'user' && 'justify-end')}
              >
                {message.role === 'assistant' && (
                  <AiAvatar expression="focused" intensity={0.45} size={28} />
                )}
                <p
                  className={cn(
                    'max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-4 py-3 text-sm leading-7',
                    message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted/40',
                  )}
                >
                  {message.content}
                </p>
              </div>
            ))}
            {responding && (
              <div className="flex items-center gap-3 text-sm text-muted-foreground" role="status">
                <AiAvatar expression={avatar.expression} intensity={avatar.intensity} size={28} />
                正在思考…
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        ) : (
          <div className="flex min-h-72 items-center justify-center py-12">
            <AiAvatar
              expression={avatar.expression}
              intensity={avatar.intensity}
              size="clamp(13rem, 28vw, 18.75rem)"
            />
          </div>
        )}
      </ScrollArea>
      <InputGroup className="mx-auto mb-3 w-full max-w-4xl shrink-0 rounded-3xl bg-card">
        <InputGroupTextarea
          ref={composerRef}
          aria-label="向 AI 提问"
          placeholder="输入问题，Enter 发送，Shift + Enter 换行"
          value={composer}
          maxLength={10000}
          disabled={loading || !config?.configured}
          onChange={(event) => setComposer(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
              event.preventDefault();
              void send();
            }
          }}
        />
        <InputGroupAddon align="block-end" className="justify-between">
          <span className="text-xs text-muted-foreground">{composer.length} / 10000</span>
          <InputGroupButton
            aria-label="发送消息"
            disabled={!composer.trim() || responding || messageLoading || !config?.configured}
            size="icon-sm"
            variant="default"
            onClick={() => void send()}
          >
            <ArrowUp />
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
    </section>
  );
}
