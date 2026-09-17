import { useMemo, useRef, useState } from 'react'
import {
  ArrowUp,
  BookOpen,
  Check,
  FileText,
  Lightbulb,
  Menu as MenuIcon,
  Mic,
  MoreHorizontal,
  Paperclip,
  PenLine,
  Plus,
  Search,
  Settings,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react'

import {
  Attachment,
  AttachmentAction,
  AttachmentActions,
  AttachmentContent,
  AttachmentDescription,
  AttachmentMedia,
  AttachmentTitle,
} from '@/components/ui/attachment'
import { Bubble, BubbleContent, BubbleGroup } from '@/components/ui/bubble'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from '@/components/ui/input-group'
import { Message, MessageAvatar, MessageContent, MessageGroup } from '@/components/ui/message'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

type ChatMessage = {
  id: string
  role: 'assistant' | 'user'
  text: string
}

type Conversation = {
  id: string
  messages: ChatMessage[]
  preview: string
  title: string
}

const starterConversations: Conversation[] = [
  {
    id: 'weekly-plan',
    title: '帮我规划本周的重点任务',
    preview: '当然，可以先按目标、截止时间和优先级整理…',
    messages: [
      { id: 'weekly-plan-user', role: 'user', text: '帮我规划本周的重点任务。' },
      { id: 'weekly-plan-ai', role: 'assistant', text: '当然。建议先选出 3 个本周必须完成的结果，再为每个结果安排不被打断的时间块。我也可以根据你的项目清单继续细化。' },
    ],
  },
  {
    id: 'note-summary',
    title: '总结这篇笔记的核心观点',
    preview: '这篇笔记主要围绕目标拆解与复盘展开…',
    messages: [
      { id: 'note-summary-user', role: 'user', text: '总结这篇笔记的核心观点。' },
      { id: 'note-summary-ai', role: 'assistant', text: '这篇笔记主要围绕目标拆解、执行节奏与复盘反馈展开，核心是把模糊目标转化为可验证的下一步行动。' },
    ],
  },
  {
    id: 'daily-review',
    title: '根据日报生成今日复盘',
    preview: '今天推进了两个关键事项，也识别出一个阻塞点…',
    messages: [
      { id: 'daily-review-user', role: 'user', text: '根据日报生成今日复盘。' },
      { id: 'daily-review-ai', role: 'assistant', text: '今天推进了两个关键事项，也识别出一个需要尽快处理的协作阻塞点。明天可以优先关闭阻塞，再继续主要交付。' },
    ],
  },
  {
    id: 'project-risks',
    title: '分析当前项目的潜在风险',
    preview: '目前最值得关注的是范围、依赖和交付节奏…',
    messages: [
      { id: 'project-risks-user', role: 'user', text: '分析当前项目的潜在风险。' },
      { id: 'project-risks-ai', role: 'assistant', text: '目前最值得关注的是需求范围持续变化、外部依赖不明确，以及验证时间被压缩。建议为每一项设置负责人和最晚确认时间。' },
    ],
  },
]

const suggestions = [
  { icon: BookOpen, text: '帮我总结最近的笔记，并提炼关键结论' },
  { icon: PenLine, text: '根据今天的工作记录，生成一份复盘' },
  { icon: Lightbulb, text: '分析当前项目，给出下一步行动建议' },
]

function responseFor(prompt: string) {
  if (prompt.includes('笔记')) return '我可以从近期笔记中提炼主题、关键结论和待办事项。接入笔记数据后，还可以按时间或标签生成更具体的摘要。'
  if (prompt.includes('复盘') || prompt.includes('工作记录')) return '建议把今天的复盘分为三个部分：已完成的结果、遇到的阻塞，以及明天最重要的一步。这样更容易把记录转化为行动。'
  if (prompt.includes('项目') || prompt.includes('行动')) return '可以先从目标清晰度、进度风险和当前阻塞三个维度检查项目，再选出一个今天就能推进的最小行动。'
  return '我已经收到你的问题。当前页面使用本地示例回复展示完整对话体验，后续接入 AI 服务后即可返回真实答案。'
}

function ConversationSidebar({
  activeId,
  conversations,
  onDelete,
  onNewChat,
  onSelect,
}: {
  activeId: string | null
  conversations: Conversation[]
  onDelete: (id: string) => void
  onNewChat: () => void
  onSelect: (id: string) => void
}) {
  const [query, setQuery] = useState('')
  const filteredConversations = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase()
    if (!normalizedQuery) return conversations
    return conversations.filter((conversation) =>
      `${conversation.title} ${conversation.preview}`.toLocaleLowerCase().includes(normalizedQuery),
    )
  }, [conversations, query])

  return (
    <aside className="flex h-full min-h-0 w-full flex-col bg-card">
      <div className="p-4 pb-2">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            aria-label="搜索对话历史"
            className="h-10 bg-background pr-3 pl-9"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索对话历史…"
            value={query}
          />
        </div>
      </div>

      <ScrollArea className="min-h-0 flex-1 px-3 py-2">
        <div className="space-y-1 pb-3">
          {filteredConversations.map((conversation) => (
            <div
              className={cn(
                'group relative w-full rounded-xl px-3 py-3 text-left transition-colors hover:bg-muted/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                activeId === conversation.id && 'bg-muted',
              )}
              key={conversation.id}
              onClick={() => onSelect(conversation.id)}
              onKeyDown={(event) => {
                if (event.currentTarget !== event.target) return
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  onSelect(conversation.id)
                }
              }}
              role="button"
              tabIndex={0}
            >
              <span className="block truncate pr-8 text-sm font-medium">{conversation.title}</span>
              <span className="mt-1 block truncate pr-8 text-xs leading-5 text-muted-foreground">{conversation.preview}</span>
              <DropdownMenu>
                <DropdownMenuTrigger
                  aria-label={`管理对话：${conversation.title}`}
                  className="absolute top-1/2 right-2 flex size-8 -translate-y-1/2 items-center justify-center rounded-lg opacity-0 transition-opacity hover:bg-background focus:opacity-100 group-hover:opacity-100 data-popup-open:opacity-100"
                  onClick={(event) => event.stopPropagation()}
                  onKeyDown={(event) => event.stopPropagation()}
                >
                  <MoreHorizontal className="size-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-36">
                  <DropdownMenuItem onClick={() => onDelete(conversation.id)} variant="destructive">
                    <Trash2 />删除对话
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
          {filteredConversations.length === 0 ? (
            <div className="px-3 py-10 text-center text-sm text-muted-foreground">没有找到相关对话</div>
          ) : null}
        </div>
      </ScrollArea>

      <div className="border-t p-4">
        <Button className="h-10 w-full" onClick={onNewChat} type="button">
          <Plus />新对话
        </Button>
      </div>
    </aside>
  )
}

export default function AiAssistant() {
  const [conversations, setConversations] = useState(starterConversations)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [composerValue, setComposerValue] = useState('')
  const [attachment, setAttachment] = useState<File | null>(null)
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)
  const [isResponding, setIsResponding] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [model, setModel] = useState('Mindforge AI')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const activeConversation = conversations.find((conversation) => conversation.id === activeId)

  const startNewChat = () => {
    setActiveId(null)
    setComposerValue('')
    setAttachment(null)
    setIsHistoryOpen(false)
  }

  const deleteConversation = (id: string) => {
    setConversations((items) => items.filter((item) => item.id !== id))
    if (activeId === id) setActiveId(null)
  }

  const sendPrompt = (rawPrompt?: string) => {
    const prompt = (rawPrompt ?? composerValue).trim()
    if (!prompt || isResponding) return

    const conversationId = activeId ?? `conversation-${Date.now()}`
    const userMessage: ChatMessage = { id: `${conversationId}-user-${Date.now()}`, role: 'user', text: prompt }
    setConversations((items) => {
      const existingConversation = items.find((item) => item.id === conversationId)
      if (existingConversation) {
        return items.map((item) => item.id === conversationId
          ? { ...item, messages: [...item.messages, userMessage], preview: prompt }
          : item)
      }
      return [{
        id: conversationId,
        title: prompt.length > 22 ? `${prompt.slice(0, 22)}…` : prompt,
        preview: prompt,
        messages: [userMessage],
      }, ...items]
    })
    setActiveId(conversationId)
    setComposerValue('')
    setAttachment(null)
    setIsResponding(true)

    window.setTimeout(() => {
      const answer = responseFor(prompt)
      setConversations((items) => items.map((item) => item.id === conversationId
        ? {
          ...item,
          preview: answer,
          messages: [...item.messages, {
            id: `${conversationId}-assistant-${Date.now()}`,
            role: 'assistant',
            text: answer,
          }],
        }
        : item))
      setIsResponding(false)
    }, 550)
  }

  return (
    <Card className="h-[calc(100dvh-10.5rem)] min-h-[520px] gap-0 overflow-hidden rounded-xl py-0">
      <div className="grid h-full min-h-0 lg:grid-cols-[300px_minmax(0,1fr)]">
        <div className="hidden min-h-0 border-r lg:block">
          <ConversationSidebar
            activeId={activeId}
            conversations={conversations}
            onDelete={deleteConversation}
            onNewChat={startNewChat}
            onSelect={setActiveId}
          />
        </div>

        <Sheet onOpenChange={setIsHistoryOpen} open={isHistoryOpen}>
          <SheetContent className="w-[min(88vw,320px)] max-w-[320px] gap-0 p-0" showCloseButton={false} side="left">
            <SheetHeader className="sr-only">
              <SheetTitle>对话历史</SheetTitle>
              <SheetDescription>搜索、打开或新建对话</SheetDescription>
            </SheetHeader>
            <ConversationSidebar
              activeId={activeId}
              conversations={conversations}
              onDelete={deleteConversation}
              onNewChat={startNewChat}
              onSelect={(id) => {
                setActiveId(id)
                setIsHistoryOpen(false)
              }}
            />
          </SheetContent>
        </Sheet>

        <main className="flex min-h-0 min-w-0 flex-col bg-background">
          <div className="flex h-14 shrink-0 items-center justify-between border-b px-4 lg:px-6">
            <div className="flex items-center gap-2">
              <Button
                aria-label="打开对话历史"
                className="lg:hidden"
                onClick={() => setIsHistoryOpen(true)}
                size="icon"
                type="button"
                variant="ghost"
              >
                <MenuIcon />
              </Button>
              <div className="flex items-center gap-2 text-sm font-medium">
                <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Sparkles className="size-4" />
                </span>
                {activeConversation?.title ?? 'AI 助手'}
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button size="sm" type="button" variant="outline" />}>
                {model}<SlidersHorizontal />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>选择模型</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {['Mindforge AI', '快速模式', '深度思考'].map((option) => (
                  <DropdownMenuItem key={option} onClick={() => setModel(option)}>
                    <span>{option}</span>{model === option ? <Check className="ml-auto" /> : null}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="min-h-0 flex-1">
            {activeConversation ? (
              <ScrollArea className="h-full">
                <div className="mx-auto w-full max-w-3xl px-5 py-8 sm:px-8">
                  <MessageGroup className="gap-6">
                    {activeConversation.messages.map((message) => (
                      <Message align={message.role === 'user' ? 'end' : 'start'} key={message.id}>
                        {message.role === 'assistant' ? (
                          <MessageAvatar className="size-8 self-start bg-primary text-primary-foreground">
                            <Sparkles className="size-4" />
                          </MessageAvatar>
                        ) : null}
                        <MessageContent>
                          <BubbleGroup>
                            <Bubble variant={message.role === 'user' ? 'default' : 'secondary'}>
                              <BubbleContent className="max-w-xl px-4 py-3 leading-6">{message.text}</BubbleContent>
                            </Bubble>
                          </BubbleGroup>
                        </MessageContent>
                      </Message>
                    ))}
                    {isResponding ? (
                      <Message>
                        <MessageAvatar className="size-8 self-start bg-primary text-primary-foreground">
                          <Sparkles className="size-4" />
                        </MessageAvatar>
                        <MessageContent>
                          <Bubble variant="secondary">
                            <BubbleContent className="flex items-center gap-1.5 px-4 py-3" aria-label="AI 正在回复">
                              <span className="size-1.5 animate-pulse rounded-full bg-muted-foreground" />
                              <span className="size-1.5 animate-pulse rounded-full bg-muted-foreground [animation-delay:120ms]" />
                              <span className="size-1.5 animate-pulse rounded-full bg-muted-foreground [animation-delay:240ms]" />
                            </BubbleContent>
                          </Bubble>
                        </MessageContent>
                      </Message>
                    ) : null}
                  </MessageGroup>
                </div>
              </ScrollArea>
            ) : (
              <ScrollArea className="h-full">
                <div className="mx-auto flex min-h-full w-full max-w-5xl flex-col justify-center px-5 py-6 sm:px-8">
                  <div className="text-center">
                    <span className="mx-auto flex size-13 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                      <Sparkles className="size-6" />
                    </span>
                    <h1 className="mt-4 text-2xl font-semibold tracking-tight sm:text-3xl">欢迎使用 Mindforge AI</h1>
                    <p className="mt-2 text-sm text-muted-foreground sm:text-base">今天想一起完成什么？</p>
                  </div>

                  <div className="mt-6 grid gap-3 md:grid-cols-3">
                    {suggestions.map((suggestion) => (
                      <button
                        className="group flex min-h-28 flex-col items-start rounded-xl border bg-card p-4 text-left transition-all hover:-translate-y-0.5 hover:border-foreground/20 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        key={suggestion.text}
                        onClick={() => sendPrompt(suggestion.text)}
                        type="button"
                      >
                        <span className="flex size-9 items-center justify-center rounded-lg border bg-background text-muted-foreground transition-colors group-hover:text-foreground">
                          <suggestion.icon className="size-4" />
                        </span>
                        <span className="mt-auto pt-3 text-sm leading-5 font-medium">{suggestion.text}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </ScrollArea>
            )}
          </div>

          <div className="shrink-0 px-4 pb-4 sm:px-6 sm:pb-6">
            <div className="mx-auto max-w-4xl">
              {attachment ? (
                <Attachment className="mb-2" size="sm">
                  <AttachmentMedia><FileText /></AttachmentMedia>
                  <AttachmentContent>
                    <AttachmentTitle>{attachment.name}</AttachmentTitle>
                    <AttachmentDescription>{Math.max(1, Math.round(attachment.size / 1024))} KB</AttachmentDescription>
                  </AttachmentContent>
                  <AttachmentActions>
                    <AttachmentAction aria-label="移除附件" onClick={() => setAttachment(null)}><X /></AttachmentAction>
                  </AttachmentActions>
                </Attachment>
              ) : null}
              <InputGroup className="rounded-xl bg-card shadow-sm">
                <InputGroupTextarea
                  aria-label="向 AI 提问"
                  className="min-h-14 max-h-32 px-4 pt-3 text-sm"
                  onChange={(event) => setComposerValue(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && !event.shiftKey) {
                      event.preventDefault()
                      sendPrompt()
                    }
                  }}
                  placeholder="问我任何问题…"
                  rows={2}
                  value={composerValue}
                />
                <InputGroupAddon align="block-end" className="justify-between px-3 pb-3">
                  <div className="flex items-center gap-1">
                    <input
                      className="hidden"
                      onChange={(event) => setAttachment(event.target.files?.[0] ?? null)}
                      ref={fileInputRef}
                      type="file"
                    />
                    <Tooltip>
                      <TooltipTrigger render={<InputGroupButton aria-label="添加附件" onClick={() => fileInputRef.current?.click()} size="icon-sm" />}>
                        <Paperclip />
                      </TooltipTrigger>
                      <TooltipContent>添加附件</TooltipContent>
                    </Tooltip>
                    <DropdownMenu>
                      <DropdownMenuTrigger render={<InputGroupButton size="sm" />}>
                        <Settings />设置
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-52">
                        <DropdownMenuLabel>回复偏好</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem>简洁回答</DropdownMenuItem>
                        <DropdownMenuItem>展示思路</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="flex items-center gap-1">
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <InputGroupButton
                            aria-label={isListening ? '停止语音输入' : '开始语音输入'}
                            className={cn(isListening && 'bg-destructive/10 text-destructive')}
                            onClick={() => setIsListening((value) => !value)}
                            size="icon-sm"
                          />
                        }
                      >
                        <Mic />
                      </TooltipTrigger>
                      <TooltipContent>{isListening ? '停止语音输入' : '语音输入'}</TooltipContent>
                    </Tooltip>
                    <InputGroupButton
                      aria-label="发送消息"
                      disabled={!composerValue.trim() || isResponding}
                      onClick={() => sendPrompt()}
                      size="icon-sm"
                      variant="default"
                    >
                      <ArrowUp />
                    </InputGroupButton>
                  </div>
                </InputGroupAddon>
              </InputGroup>
              <p className="mt-2 text-center text-[11px] text-muted-foreground">AI 可能会出错，请核对重要信息。</p>
            </div>
          </div>
        </main>
      </div>
    </Card>
  )
}
