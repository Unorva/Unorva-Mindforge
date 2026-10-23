import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react';
import {
  ArrowUp,
  Brain,
  CalendarClock,
  ChevronDown,
  History,
  Loader2,
  MessageCircle,
  Plus,
  Puzzle,
  Square,
  Trash2,
  Wrench,
} from 'lucide-react';
import { AiAvatar } from '@/components/ai-avatar';
import {
  createConversation,
  deleteConversation,
  getAiConfig,
  getConversations,
  getMessages,
  streamMessage,
  type AiActivity,
  type AiConfig,
  type ChatMessage,
  type Conversation,
} from '@/api/ai/ai';
import { Button } from '@/components/ui/button';
import { Bubble, BubbleContent } from '@/components/ui/bubble';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Marker, MarkerContent, MarkerIcon } from '@/components/ui/marker';
import { Message, MessageContent } from '@/components/ui/message';
import {
  MessageScrollerProvider,
  MessageScroller,
  MessageScrollerViewport,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerButton,
} from '@/components/ui/message-scroller';
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
import { cn } from '@/lib/utils';
import { toast } from '@/components/ui/toast';
import AutomationDialog from './automation-dialog';
import MarketDialog from './market-dialog';
import { AssistantContent } from './assistant-content';

interface ReplyDetailsData {
  reasoning: string;
  activities: AiActivity[];
}

interface PendingReply extends ReplyDetailsData {
  prompt: string;
  content: string;
  status: 'running' | 'stopped' | 'error';
}

function ReplyDetails({
  reasoning,
  activities,
  running = false,
}: ReplyDetailsData & { running?: boolean }) {
  const tools = activities.filter((activity) => activity.type === 'tool');
  return (
    <div className="space-y-2">
      {reasoning && (
        <Collapsible>
          <CollapsibleTrigger className="group flex cursor-pointer items-center gap-2 text-left">
            <Marker render={<span />}>
              <MarkerIcon>{running ? <Loader2 className="animate-spin" /> : <Brain />}</MarkerIcon>
              <MarkerContent>{running ? '正在思考' : '思考过程'}</MarkerContent>
            </Marker>
            <ChevronDown className="size-3.5 text-muted-foreground transition-transform group-data-[panel-open]:rotate-180" />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="mt-2 max-h-64 overflow-y-auto border-l-2 pl-4 text-muted-foreground">
              <AssistantContent content={reasoning} streaming={running} />
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}
      {tools.map((activity, index) => (
        <Marker key={`${activity.name ?? 'tool'}-${index}`}>
          <MarkerIcon>
            <Wrench />
          </MarkerIcon>
          <MarkerContent>
            {activity.state === 'complete'
              ? '工具已完成'
              : activity.state === 'requested'
                ? '请求调用工具'
                : '正在调用工具'}
            {activity.name ? `：${activity.name}` : ''}
            {activity.detail ? ` · ${activity.detail}` : ''}
          </MarkerContent>
        </Marker>
      ))}
    </div>
  );
}

function conversationTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('zh-CN', { month: 'numeric', day: 'numeric' }).format(date);
}

export default function AiAssistant() {
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
  const [pending, setPending] = useState<PendingReply | null>(null);
  const [replyDetails, setReplyDetails] = useState<Record<number, ReplyDetailsData>>({});
  const requestId = useRef(0);
  const streamController = useRef<AbortController | null>(null);
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
    const refresh = () => {
      void getAiConfig()
        .then((result) => setConfig(result.data))
        .catch(() => undefined);
    };
    window.addEventListener('mindforge-ai-settings-changed', refresh);
    return () => window.removeEventListener('mindforge-ai-settings-changed', refresh);
  }, []);
  useEffect(
    () => () => {
      ++requestId.current;
      streamController.current?.abort();
    },
    [],
  );

  const selectConversation = async (id: number) => {
    if (responding) return;
    const currentRequest = ++requestId.current;
    setActiveId(id);
    setHistoryOpen(false);
    setMessageLoading(true);
    setMessages([]);
    setPending(null);
    setError('');
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
    if (!content || streamController.current || responding || !config?.configured || messageLoading)
      return;
    const controller = new AbortController();
    streamController.current = controller;
    const currentRequest = ++requestId.current;
    const draft: PendingReply = {
      prompt: content,
      content: '',
      reasoning: '',
      activities: [],
      status: 'running',
    };
    setResponding(true);
    setError('');
    setPending({ ...draft });
    let conversationId = activeId;
    try {
      if (conversationId === null) {
        const created = await createConversation(content.slice(0, 100), controller.signal);
        if (currentRequest !== requestId.current || controller.signal.aborted) {
          throw new DOMException('已停止生成', 'AbortError');
        }
        conversationId = created.data.id;
        setActiveId(conversationId);
        setConversations((items) => [created.data, ...items]);
      }
      if (controller.signal.aborted) throw new DOMException('已停止生成', 'AbortError');
      const updatePending = () => {
        if (currentRequest === requestId.current) setPending({ ...draft });
      };
      const result = await streamMessage(
        conversationId,
        content,
        {
          onContent(delta) {
            draft.content += delta;
            updatePending();
          },
          onReasoning(delta) {
            draft.reasoning += delta;
            updatePending();
          },
          onActivity(activity) {
            const existing = draft.activities.findIndex(
              (item) => item.type === activity.type && item.name === activity.name,
            );
            draft.activities =
              existing < 0
                ? [...draft.activities, activity]
                : draft.activities.map((item, index) => (index === existing ? activity : item));
            updatePending();
          },
        },
        controller.signal,
      );
      if (currentRequest !== requestId.current) return;
      setMessages((items) => [...items, result.userMessage, result.assistantMessage]);
      setReplyDetails((items) => ({
        ...items,
        [result.assistantMessage.id]: { reasoning: draft.reasoning, activities: draft.activities },
      }));
      setPending(null);
      setConversations((items) => [
        result.conversation,
        ...items.filter((item) => item.id !== conversationId),
      ]);
      setComposer((current) => (current === submittedComposer ? '' : current));
    } catch (cause) {
      if (currentRequest !== requestId.current) return;
      const stopped = controller.signal.aborted;
      if (streamController.current === controller) streamController.current = null;
      setResponding(false);
      setPending({ ...draft, status: stopped ? 'stopped' : 'error' });
      setError(
        stopped
          ? '已停止生成，部分回复未保存。输入已保留，可重新发送。'
          : `${cause instanceof Error ? cause.message : '回复生成失败。'} 输入已保留，可重试。`,
      );
      if (conversationId !== null) {
        try {
          const recovered = (await getMessages(conversationId)).data;
          if (currentRequest !== requestId.current) return;
          setMessages(recovered);
          const userMessage = recovered[recovered.length - 2];
          const assistantMessage = recovered[recovered.length - 1];
          if (
            userMessage?.role === 'user' &&
            userMessage.content === content &&
            assistantMessage?.role === 'assistant' &&
            assistantMessage.id !== messages[messages.length - 1]?.id
          ) {
            setPending(null);
            setComposer((current) => (current === submittedComposer ? '' : current));
            setError('连接已结束，已恢复服务器保存的完整回复。');
          }
        } catch {
          /* 请求层已提示加载失败。 */
        }
      }
    } finally {
      if (streamController.current === controller) streamController.current = null;
      if (currentRequest === requestId.current) setResponding(false);
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
        setPending(null);
      }
    } catch {
      setError('删除对话失败，请重试。');
    }
  };

  return (
    <section className="flex h-[calc(100dvh-6.5rem-1px)] min-h-0 flex-col overflow-hidden">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 py-2">
        <span className="truncate text-sm text-muted-foreground">
          {loading
            ? '加载 AI 配置…'
            : config?.configured
              ? `${config.provider} · ${config.model}`
              : config?.enabled === false
                ? 'AI 服务已停用'
                : '尚未配置可用 AI 模型'}
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
              setPending(null);
              setError('');
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
          请在“账户设置 → AI 配置”中保存接口和密钥，并启用至少一个模型后使用对话。
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
      <MessageScrollerProvider key={activeId ?? 'new'} defaultScrollPosition="end" autoScroll>
        <MessageScroller className="min-h-0 flex-1">
          <MessageScrollerViewport aria-label="AI 对话消息">
            {messages.length || pending || messageLoading ? (
              <MessageScrollerContent className="mx-auto w-full max-w-3xl gap-5 px-4 py-6">
                {messageLoading && <p className="text-sm text-muted-foreground">正在加载消息…</p>}
                {messages.map((message) => (
                  <MessageScrollerItem
                    key={message.id}
                    messageId={String(message.id)}
                    scrollAnchor={message.role === 'user'}
                  >
                    <Message align={message.role === 'user' ? 'end' : 'start'}>
                      <MessageContent>
                        {message.role === 'assistant' && replyDetails[message.id] && (
                          <ReplyDetails {...replyDetails[message.id]} />
                        )}
                        <Bubble
                          variant={message.role === 'user' ? 'default' : 'ghost'}
                          className={cn(message.role === 'assistant' && 'w-full')}
                        >
                          <BubbleContent
                            className={cn(
                              message.role === 'user' ? 'whitespace-pre-wrap leading-7' : 'w-full',
                            )}
                          >
                            {message.role === 'user' ? (
                              message.content
                            ) : (
                              <AssistantContent content={message.content} />
                            )}
                          </BubbleContent>
                        </Bubble>
                      </MessageContent>
                    </Message>
                  </MessageScrollerItem>
                ))}
                {pending && (
                  <>
                    <MessageScrollerItem messageId="pending-user" scrollAnchor>
                      <Message align="end">
                        <MessageContent>
                          <Bubble>
                            <BubbleContent className="whitespace-pre-wrap leading-7">
                              {pending.prompt}
                            </BubbleContent>
                          </Bubble>
                        </MessageContent>
                      </Message>
                    </MessageScrollerItem>
                    <MessageScrollerItem messageId="pending-assistant">
                      <Message>
                        <MessageContent>
                          <ReplyDetails
                            reasoning={pending.reasoning}
                            activities={pending.activities}
                            running={responding && !pending.content}
                          />
                          {pending.content && (
                            <AssistantContent content={pending.content} streaming={responding} />
                          )}
                          <Marker role="status" aria-live="polite">
                            <MarkerIcon>
                              {responding ? <Loader2 className="animate-spin" /> : <Square />}
                            </MarkerIcon>
                            <MarkerContent>
                              {responding
                                ? pending.content
                                  ? '正在回复…'
                                  : pending.reasoning
                                    ? '正在思考…'
                                    : '正在连接模型…'
                                : pending.status === 'stopped'
                                  ? '生成已停止'
                                  : '生成中断'}
                            </MarkerContent>
                          </Marker>
                        </MessageContent>
                      </Message>
                    </MessageScrollerItem>
                  </>
                )}
              </MessageScrollerContent>
            ) : (
              <div className="flex h-full min-h-0 items-center justify-center py-6">
                <AiAvatar expression="idle" intensity={0.4} size="clamp(13rem, 28vw, 18.75rem)" />
              </div>
            )}
          </MessageScrollerViewport>
          <MessageScrollerButton aria-label="滚动到最新消息" />
        </MessageScroller>
      </MessageScrollerProvider>
      <div className="relative z-1 shrink-0 px-2 pt-4 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:px-4">
        <InputGroup className="mx-auto w-full max-w-4xl rounded-3xl border-border/70 bg-card/95 shadow-[0_8px_32px_-8px_rgba(0,0,0,0.18)] backdrop-blur-xl dark:bg-card/95 dark:shadow-[0_8px_32px_-8px_rgba(0,0,0,0.5)]">
          <InputGroupTextarea
            ref={composerRef}
            className="max-h-[min(28dvh,12rem)] min-h-20 overflow-y-auto px-4 pt-4"
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
              aria-label={responding ? '停止生成' : '发送消息'}
              disabled={!responding && (!composer.trim() || messageLoading || !config?.configured)}
              size="icon-sm"
              variant="default"
              onClick={() => (responding ? streamController.current?.abort() : void send())}
            >
              {responding ? <Square /> : <ArrowUp />}
            </InputGroupButton>
          </InputGroupAddon>
        </InputGroup>
      </div>
    </section>
  );
}
