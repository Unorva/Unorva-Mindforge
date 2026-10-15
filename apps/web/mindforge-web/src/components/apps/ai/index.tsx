import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowUp, History, Plus, Search, Trash2 } from 'lucide-react';
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
import { Input } from '@/components/ui/input';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from '@/components/ui/input-group';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

export default function AiAssistant() {
  const avatar = useAiAvatarController('idle');
  const [config, setConfig] = useState<AiConfig | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [composer, setComposer] = useState('');
  const [search, setSearch] = useState('');
  const [historyOpen, setHistoryOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [responding, setResponding] = useState(false);
  const [messageLoading, setMessageLoading] = useState(false);
  const [error, setError] = useState('');
  const requestId = useRef(0);
  const bottomRef = useRef<HTMLDivElement>(null);

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
    const content = composer.trim();
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
      setComposer('');
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
      avatar.play({ expression: 'worried', intensity: 0.7, durationMs: 2400, returnTo: 'idle' });
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
      <div className="flex shrink-0 items-center justify-between gap-3 py-2">
        <span className="truncate text-sm text-muted-foreground">
          {loading
            ? '加载 AI 配置…'
            : config?.configured
              ? `${config.provider} · ${config.model}`
              : '尚未配置 AI 服务'}
        </span>
        <div className="flex gap-2">
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
      <Sheet open={historyOpen} onOpenChange={setHistoryOpen}>
        <SheetContent side="left" className="flex w-80 flex-col">
          <SheetHeader>
            <SheetTitle>对话历史</SheetTitle>
            <SheetDescription>对话已保存到你的个人工作台</SheetDescription>
          </SheetHeader>
          <div className="relative">
            <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
            <Input
              aria-label="搜索对话"
              className="pl-9"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="搜索对话标题"
            />
          </div>
          <ScrollArea className="min-h-0 flex-1">
            {conversations
              .filter((item) => item.title.toLowerCase().includes(search.toLowerCase()))
              .map((item) => (
                <div
                  key={item.id}
                  className={cn(
                    'my-1 flex items-center gap-1 rounded-lg',
                    item.id === activeId && 'bg-muted',
                  )}
                >
                  <Button
                    className="min-w-0 flex-1 justify-start"
                    disabled={responding}
                    variant="ghost"
                    onClick={() => void selectConversation(item.id)}
                  >
                    <span className="truncate">{item.title}</span>
                  </Button>
                  <Button
                    aria-label={`删除 ${item.title}`}
                    disabled={responding}
                    size="icon-sm"
                    variant="ghost"
                    onClick={() => void remove(item.id)}
                  >
                    <Trash2 />
                  </Button>
                </div>
              ))}
            {!conversations.length && (
              <p className="py-8 text-center text-sm text-muted-foreground">
                还没有对话，开始你的第一个问题。
              </p>
            )}
          </ScrollArea>
        </SheetContent>
      </Sheet>
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
