import { useRef, useState } from 'react'
import {
  AudioWaveform,
  ArrowUp,
  Check,
  ChevronDown,
  FileText,
  History,
  LoaderCircle,
  Mic,
  MoreHorizontal,
  Plus,
  Search,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react'

import bloubAnimation from '@/assets/images/bloub-demo.gif'
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
import { APP_WORKSPACE_HEIGHT_CLASS } from '@/components/shared/app-workspace'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from '@/components/ui/input-group'
import { Input } from '@/components/ui/input'
import { Message, MessageContent, MessageGroup } from '@/components/ui/message'
import { Marker, MarkerContent, MarkerIcon } from '@/components/ui/marker'
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

function responseFor(prompt: string) {
  if (prompt.includes('笔记')) return '我可以从近期笔记中提炼主题、关键结论和待办事项。接入笔记数据后，还可以按时间或标签生成更具体的摘要。'
  if (prompt.includes('复盘') || prompt.includes('工作记录')) return '建议把今天的复盘分为三个部分：已完成的结果、遇到的阻塞，以及明天最重要的一步。这样更容易把记录转化为行动。'
  if (prompt.includes('项目') || prompt.includes('行动')) return '可以先从目标清晰度、进度风险和当前阻塞三个维度检查项目，再选出一个今天就能推进的最小行动。'
  return '我已经收到你的问题。当前页面使用本地示例回复展示完整对话体验，后续接入 AI 服务后即可返回真实答案。'
}

function ConversationHistory({
  activeId,
  conversations,
  onDelete,
  onSelect,
}: {
  activeId: string | null
  conversations: Conversation[]
  onDelete: (id: string) => void
  onSelect: (id: string) => void
}) {
  const [searchQuery, setSearchQuery] = useState('')
  const normalizedQuery = searchQuery.trim().toLocaleLowerCase()
  const filteredConversations = normalizedQuery
    ? conversations.filter((conversation) => (
        `${conversation.title} ${conversation.preview}`.toLocaleLowerCase().includes(normalizedQuery)
      ))
    : conversations

  return (
    <aside className="flex h-full min-h-0 w-full flex-col bg-card">
      <div className="border-b px-4 py-3">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            aria-label="搜索历史对话"
            className="h-10 rounded-xl bg-muted/40 pr-3 pl-9"
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="搜索历史对话…"
            type="search"
            value={searchQuery}
          />
        </div>
      </div>

      <ScrollArea className="min-h-0 flex-1 px-3 py-2">
        <div className="space-y-1 pb-3">
          {filteredConversations.length === 0 ? (
            <div className="px-3 py-10 text-center text-sm text-muted-foreground">没有找到相关对话</div>
          ) : null}
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
        </div>
      </ScrollArea>
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
  const [model, setModel] = useState('GPT-5.6 Sol')
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
    <section className={cn(APP_WORKSPACE_HEIGHT_CLASS, 'overflow-hidden')}>
      <div className="h-full min-h-0">
        <Sheet onOpenChange={setIsHistoryOpen} open={isHistoryOpen}>
          <SheetContent className="w-[min(90vw,380px)] max-w-[380px] gap-0 p-0" side="left">
            <SheetHeader className="border-b px-5 py-4 pr-12">
              <SheetTitle>对话历史</SheetTitle>
              <SheetDescription>搜索或打开以前的对话</SheetDescription>
            </SheetHeader>
            <ConversationHistory
              activeId={activeId}
              conversations={conversations}
              onDelete={deleteConversation}
              onSelect={(id) => {
                setActiveId(id)
                setIsHistoryOpen(false)
              }}
            />
          </SheetContent>
        </Sheet>

        <main className="relative flex h-full min-h-0 min-w-0 flex-col bg-background">
          <div aria-label="对话操作" className="absolute top-0 right-0 z-10 flex items-center gap-2 py-2" role="toolbar">
            <Button onClick={() => setIsHistoryOpen(true)} type="button" variant="outline">
              <History />
              <span className="hidden sm:inline">历史记录</span>
              <span className="sr-only sm:hidden">打开对话历史</span>
            </Button>
            <Button onClick={startNewChat} type="button">
              <Plus />
              <span>新对话</span>
            </Button>
          </div>
          <div className="min-h-0 flex-1">
            {activeConversation ? (
              <ScrollArea className="h-full">
                <div className="mx-auto w-full max-w-3xl px-5 py-8 sm:px-8">
                  <MessageGroup className="gap-6">
                    {activeConversation.messages.map((message) => (
                      message.role === 'assistant' ? (
                        <Marker className="max-w-xl items-start py-1.5" key={message.id}>
                          <MarkerIcon className="mt-0.5">
                            <Sparkles />
                          </MarkerIcon>
                          <MarkerContent className="leading-6">{message.text}</MarkerContent>
                        </Marker>
                      ) : (
                        <Message align="end" key={message.id}>
                          <MessageContent>
                            <BubbleGroup>
                              <Bubble>
                                <BubbleContent className="max-w-xl px-4 py-3 leading-6">{message.text}</BubbleContent>
                              </Bubble>
                            </BubbleGroup>
                          </MessageContent>
                        </Message>
                      )
                    ))}
                    {isResponding ? (
                      <Marker aria-live="polite" className="max-w-xl py-1.5 opacity-50" role="status">
                        <MarkerIcon>
                          <LoaderCircle className="animate-spin" />
                        </MarkerIcon>
                        <MarkerContent>正在思考…</MarkerContent>
                      </Marker>
                    ) : null}
                  </MessageGroup>
                </div>
              </ScrollArea>
            ) : (
              <ScrollArea className="h-full">
                <div className="mx-auto flex min-h-full w-full max-w-5xl items-center justify-center px-5 py-6 sm:px-8">
                  <figure className="flex items-center justify-center" data-testid="bloub-animation">
                    <img
                      alt="Mindforge AI 动态助手"
                      className="size-[clamp(13rem,28vw,18.75rem)] object-contain contrast-[1.05] motion-reduce:hidden dark:mix-blend-screen dark:invert"
                      draggable={false}
                      src={bloubAnimation}
                    />
                    <figcaption className="hidden text-center text-lg font-medium text-muted-foreground motion-reduce:block">
                      Mindforge AI
                    </figcaption>
                  </figure>
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
              <InputGroup className="min-h-[108px] rounded-[1.75rem] border-border/80 bg-card shadow-[0_8px_28px_rgba(15,23,42,0.06)] has-[[data-slot=input-group-control]:focus-visible]:border-border/80 has-[[data-slot=input-group-control]:focus-visible]:ring-0">
                <InputGroupTextarea
                  aria-label="向 AI 提问"
                  className="min-h-14 max-h-36 px-6 pt-4 text-base leading-6 placeholder:text-muted-foreground/55"
                  onChange={(event) => setComposerValue(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && !event.shiftKey) {
                      event.preventDefault()
                      sendPrompt()
                    }
                  }}
                  placeholder="随心输入"
                  rows={2}
                  value={composerValue}
                />
                <InputGroupAddon align="block-end" className="justify-between px-4 pb-3 sm:px-5">
                  <div className="flex min-w-0 items-center gap-1">
                    <input
                      className="hidden"
                      onChange={(event) => setAttachment(event.target.files?.[0] ?? null)}
                      ref={fileInputRef}
                      type="file"
                    />
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <InputGroupButton
                            aria-label="添加附件"
                            className="rounded-full"
                            onClick={() => fileInputRef.current?.click()}
                            size="icon-sm"
                          />
                        }
                      >
                        <Plus className="size-5" />
                      </TooltipTrigger>
                      <TooltipContent>添加附件</TooltipContent>
                    </Tooltip>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={<InputGroupButton className="h-9 rounded-full px-2.5 text-foreground" size="sm" />}
                      >
                        <span>{model}</span>
                        <span className="text-muted-foreground">高</span>
                        <ChevronDown className="size-3.5 text-muted-foreground" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-52">
                        <DropdownMenuGroup>
                          <DropdownMenuLabel>选择模型</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          {['GPT-5.6 Sol', 'GPT-6 Astra', 'GPT-5.6 Terra'].map((option) => (
                            <DropdownMenuItem key={option} onClick={() => setModel(option)}>
                              <span>{option}</span>
                              {model === option ? <Check className="ml-auto" /> : null}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuGroup>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <InputGroupButton
                            aria-label={isListening ? '停止语音输入' : '开始语音输入'}
                            className={cn('rounded-full', isListening && 'bg-muted text-foreground')}
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
                      aria-label={composerValue.trim() ? '发送消息' : isListening ? '停止语音对话' : '开始语音对话'}
                      className="size-10 rounded-full"
                      disabled={isResponding}
                      onClick={() => composerValue.trim() ? sendPrompt() : setIsListening((value) => !value)}
                      size="icon-sm"
                      variant="default"
                    >
                      {composerValue.trim() ? <ArrowUp className="size-5" /> : <AudioWaveform className="size-5" />}
                    </InputGroupButton>
                  </div>
                </InputGroupAddon>
              </InputGroup>
            </div>
          </div>
        </main>
      </div>
    </section>
  )
}
