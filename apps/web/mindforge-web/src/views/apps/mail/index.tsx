import { useMemo, useState } from 'react'
import {
  Archive,
  ChevronLeft,
  File,
  Inbox,
  Menu,
  MoreHorizontal,
  Paperclip,
  Pencil,
  Search,
  Send,
  Star,
  Trash2,
} from 'lucide-react'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { AppPage, AppPageDivider, AppPageHeader, AppWorkspace } from '@/components/shared/app-workspace'
import { cn } from '@/lib/utils'

type MailCategory = '项目协作' | '系统通知' | '产品更新'

type MailItem = {
  id: number
  sender: string
  initials: string
  subject: string
  preview: string
  body: string[]
  category: MailCategory
  time: string
  date: string
  starred: boolean
  unread: boolean
}

const initialMails: MailItem[] = [
  {
    id: 1,
    sender: '林晓雨',
    initials: '林',
    subject: '项目「Mindforge」本周迭代安排',
    preview: '我已整理好本周需要确认的需求和交付节点，请你抽空看一下。',
    body: [
      '你好，',
      '我已整理好本周需要确认的需求和交付节点。邮件中心这一版会先聚焦收件箱、搜索、筛选与阅读体验，方便团队把零散通知放到同一个入口。',
      '附件中包含了待确认的事项。确认后我会同步更新项目看板。',
      '谢谢！',
    ],
    category: '项目协作',
    time: '10:24',
    date: '今天',
    starred: true,
    unread: true,
  },
  {
    id: 2,
    sender: 'Mindforge',
    initials: 'M',
    subject: '你的每日复盘已保存',
    preview: '2026 年 9 月 8 日的复盘记录已经成功保存。',
    body: [
      '你好，',
      '2026 年 9 月 8 日的每日复盘已经成功保存。你可以随时回到每日复盘页面继续编辑。',
      '祝工作顺利。',
    ],
    category: '系统通知',
    time: '昨天',
    date: '昨天',
    starred: false,
    unread: true,
  },
  {
    id: 3,
    sender: '陈思远',
    initials: '陈',
    subject: '关于需求优先级的补充说明',
    preview: 'P0 的两个问题已经补充到需求列表，请在评审前确认。',
    body: [
      '你好，',
      'P0 的两个问题已经补充到需求列表。建议先确认范围，再进入实现排期，避免影响本周的交付节奏。',
      '如果有需要，我可以一起参加评审。',
    ],
    category: '项目协作',
    time: '昨天',
    date: '昨天',
    starred: false,
    unread: false,
  },
  {
    id: 4,
    sender: '产品团队',
    initials: '产',
    subject: 'Mindforge 组件更新说明',
    preview: '新的输入组和空状态组件已可在项目中使用。',
    body: [
      '大家好，',
      '新的输入组和空状态组件已经可以在项目中使用。本次更新重点改善了表单、列表和移动端抽屉的体验。',
      '如有组件需求，欢迎直接在项目中提出。',
    ],
    category: '产品更新',
    time: '9 月 6 日',
    date: '9 月 6 日',
    starred: true,
    unread: false,
  },
  {
    id: 5,
    sender: '赵一鸣',
    initials: '赵',
    subject: '缺陷 #128 已修复，等待验收',
    preview: '请在测试环境确认详情页的筛选条件是否符合预期。',
    body: [
      '你好，',
      '缺陷 #128 已修复并部署到测试环境。请重点确认详情页的筛选条件、空状态和移动端布局。',
      '验收通过后我会关闭该问题。',
    ],
    category: '项目协作',
    time: '9 月 5 日',
    date: '9 月 5 日',
    starred: false,
    unread: false,
  },
]

const folders = [
  { label: '收件箱', icon: Inbox, count: 4 },
  { label: '已加星标', icon: Star },
  { label: '已发送', icon: Send },
  { label: '草稿箱', icon: File, count: 2 },
  { label: '归档', icon: Archive },
  { label: '废纸篓', icon: Trash2 },
]

const categoryClasses: Record<MailCategory, string> = {
  项目协作: 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300',
  系统通知: 'bg-violet-50 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300',
  产品更新: 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300',
}

function MailFolders({ activeFolder, onSelect }: { activeFolder: string; onSelect: (folder: string) => void }) {
  return (
    <div className="flex h-full w-full flex-col gap-6 p-4">
      <Button className="w-full justify-start" onClick={() => onSelect('新建邮件')}>
        <Pencil />
        新建邮件
      </Button>

      <nav className="space-y-1" aria-label="邮件文件夹">
        {folders.map(({ label, icon: Icon, count }) => (
          <button
            className={cn(
              'flex h-9 w-full items-center gap-3 rounded-lg px-3 text-sm transition-colors',
              activeFolder === label ? 'bg-muted font-medium text-foreground' : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground',
            )}
            key={label}
            onClick={() => onSelect(label)}
            type="button"
          >
            <Icon className="size-4" />
            <span className="flex-1 text-left">{label}</span>
            {count ? <span className="text-xs tabular-nums">{count}</span> : null}
          </button>
        ))}
      </nav>

      <div className="mt-auto rounded-xl border bg-muted/35 p-3 text-xs leading-5 text-muted-foreground">
        <p className="font-medium text-foreground">邮箱空间</p>
        <p className="mt-1">已使用 1.8 GB / 5 GB</p>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
          <div className="h-full w-[36%] rounded-full bg-primary" />
        </div>
      </div>
    </div>
  )
}

export default function MailApp() {
  const [mails, setMails] = useState(initialMails)
  const [selectedId, setSelectedId] = useState(1)
  const [query, setQuery] = useState('')
  const [activeFolder, setActiveFolder] = useState('收件箱')
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [foldersOpen, setFoldersOpen] = useState(false)
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false)

  const visibleMails = useMemo(() => {
    const keyword = query.trim().toLowerCase()
    const folderMails = activeFolder === '已加星标' ? mails.filter((mail) => mail.starred) : mails
    if (!keyword) return folderMails
    return folderMails.filter((mail) => `${mail.sender}${mail.subject}${mail.preview}`.toLowerCase().includes(keyword))
  }, [activeFolder, mails, query])

  const selectedMail = visibleMails.find((mail) => mail.id === selectedId) ?? visibleMails[0] ?? mails[0]
  const allVisibleSelected = visibleMails.length > 0 && visibleMails.every((mail) => selectedIds.includes(mail.id))

  const selectFolder = (folder: string) => {
    setActiveFolder(folder)
    setFoldersOpen(false)
  }

  const toggleStar = (id: number) => {
    setMails((current) => current.map((mail) => (mail.id === id ? { ...mail, starred: !mail.starred } : mail)))
  }

  const toggleSelected = (id: number, checked: boolean) => {
    setSelectedIds((current) => (checked ? [...current, id] : current.filter((selected) => selected !== id)))
  }

  return (
    <AppPage>
      <AppPageHeader
        title="邮件中心"
      />
      <AppPageDivider />
      <AppWorkspace className="flex min-h-[calc(100dvh-15rem)] flex-col">
        <div className="flex items-center justify-between border-b p-3 lg:hidden">
          <Button aria-label="打开邮件文件夹" onClick={() => setFoldersOpen(true)} size="icon" variant="outline">
            <Menu />
          </Button>
          <Button onClick={() => selectFolder('新建邮件')} size="sm"><Pencil />新建邮件</Button>
        </div>
        <div className="flex min-h-0 flex-1">
          <aside className="hidden w-56 shrink-0 border-r lg:block">
            <MailFolders activeFolder={activeFolder} onSelect={selectFolder} />
          </aside>

          <Sheet onOpenChange={setFoldersOpen} open={foldersOpen}>
            <SheetContent className="w-72 p-0" showCloseButton={false} side="left">
              <SheetTitle className="sr-only">邮件文件夹</SheetTitle>
              <MailFolders activeFolder={activeFolder} onSelect={selectFolder} />
            </SheetContent>
          </Sheet>

          <section
            aria-label="邮件列表"
            className={cn(
              'min-w-0 w-full flex-1 border-r md:flex md:w-auto xl:max-w-[390px]',
              mobileDetailOpen ? 'hidden md:flex' : 'flex',
            )}
          >
            <div className="flex min-w-0 flex-1 flex-col">
              <div className="space-y-3 border-b p-3">
                <label className="relative block">
                  <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input aria-label="搜索邮件" className="pl-9" onChange={(event) => setQuery(event.target.value)} placeholder="搜索邮件…" value={query} />
                </label>
                <div className="flex items-center gap-3 px-1 text-xs text-muted-foreground">
                  <Checkbox
                    aria-label="选择全部可见邮件"
                    checked={allVisibleSelected}
                    onCheckedChange={(checked) => setSelectedIds(checked ? visibleMails.map((mail) => mail.id) : [])}
                  />
                  <span>{selectedIds.length ? `已选择 ${selectedIds.length} 封` : `${visibleMails.length} 封邮件`}</span>
                </div>
              </div>

              <ScrollArea className="min-h-0 flex-1">
                {visibleMails.length ? (
                  visibleMails.map((mail) => (
                    <article
                      className={cn(
                        'group flex cursor-pointer gap-3 border-b px-3 py-3 transition-colors hover:bg-muted/60',
                        selectedMail.id === mail.id && 'bg-muted',
                        mail.unread && 'bg-primary/[0.035]',
                      )}
                      key={mail.id}
                      onClick={() => {
                        setSelectedId(mail.id)
                        setMobileDetailOpen(true)
                      }}
                    >
                      <div className="pt-1" onClick={(event) => event.stopPropagation()}>
                        <Checkbox
                          aria-label={`选择来自 ${mail.sender} 的邮件`}
                          checked={selectedIds.includes(mail.id)}
                          onCheckedChange={(checked) => toggleSelected(mail.id, checked)}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className={cn('min-w-0 flex-1 truncate text-sm', mail.unread && 'font-semibold')}>{mail.sender}</p>
                          <time className="shrink-0 text-xs text-muted-foreground">{mail.time}</time>
                        </div>
                        <p className={cn('mt-1 truncate text-sm', mail.unread && 'font-medium')}>{mail.subject}</p>
                        <p className="mt-1 truncate text-xs leading-5 text-muted-foreground">{mail.preview}</p>
                        <div className="mt-2 flex items-center gap-2">
                          <Badge className={cn('border-0 text-[11px]', categoryClasses[mail.category])} variant="outline">
                            {mail.category}
                          </Badge>
                          <button
                            aria-label={mail.starred ? '取消星标' : '添加星标'}
                            className="ml-auto text-muted-foreground hover:text-amber-500"
                            onClick={(event) => {
                              event.stopPropagation()
                              toggleStar(mail.id)
                            }}
                            type="button"
                          >
                            <Star className={cn('size-4', mail.starred && 'fill-amber-400 text-amber-400')} />
                          </button>
                        </div>
                      </div>
                    </article>
                  ))
                ) : (
                  <div className="flex h-full min-h-72 flex-col items-center justify-center px-6 text-center">
                    <Search className="size-7 text-muted-foreground" />
                    <p className="mt-3 text-sm font-medium">没有找到匹配的邮件</p>
                    <p className="mt-1 text-xs text-muted-foreground">换个关键词试试</p>
                  </div>
                )}
              </ScrollArea>
            </div>
          </section>

          <section className="hidden min-w-0 flex-1 flex-col md:flex" aria-label="邮件详情">
            <div className="flex min-h-16 items-center gap-1 border-b px-4 sm:px-6">
              <Button aria-label="归档邮件" size="icon-sm" variant="ghost"><Archive /></Button>
              <Button aria-label="删除邮件" size="icon-sm" variant="ghost"><Trash2 /></Button>
              <Button aria-label="更多操作" className="ml-auto" size="icon-sm" variant="ghost"><MoreHorizontal /></Button>
            </div>
            <ScrollArea className="min-h-0 flex-1">
              <div className="mx-auto max-w-3xl p-6 sm:p-8">
                <div className="flex items-start gap-4">
                  <Avatar size="lg">
                    <AvatarFallback>{selectedMail.initials}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <p className="font-semibold">{selectedMail.sender}</p>
                      <Badge className={cn('border-0 text-[11px]', categoryClasses[selectedMail.category])} variant="outline">
                        {selectedMail.category}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">发送给 我 · {selectedMail.date} {selectedMail.time}</p>
                  </div>
                  <Button aria-label="添加星标" onClick={() => toggleStar(selectedMail.id)} size="icon-sm" variant="ghost">
                    <Star className={cn('size-4', selectedMail.starred && 'fill-amber-400 text-amber-400')} />
                  </Button>
                </div>

                <div className="mt-8 border-b pb-6">
                  <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">{selectedMail.subject}</h2>
                </div>

                <div className="space-y-4 pt-6 text-sm leading-7 text-foreground/85">
                  {selectedMail.body.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
                </div>

                <div className="mt-8 flex items-center gap-2 rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground">
                  <Paperclip className="size-4" />
                  <span className="flex-1 truncate">本周迭代安排.pdf</span>
                  <span>1.2 MB</span>
                </div>

                <div className="mt-8 flex flex-wrap gap-2">
                  <Button size="sm"><ChevronLeft className="rotate-180" />回复</Button>
                  <Button size="sm" variant="outline">转发</Button>
                </div>
              </div>
            </ScrollArea>
          </section>

          <section
            aria-label="移动端邮件详情"
            className={cn('min-w-0 flex-1 flex-col md:hidden', mobileDetailOpen ? 'flex' : 'hidden')}
          >
            <div className="flex items-center gap-2 border-b px-3 py-3">
              <Button aria-label="返回邮件列表" onClick={() => setMobileDetailOpen(false)} size="icon-sm" variant="ghost"><ChevronLeft /></Button>
              <p className="min-w-0 flex-1 truncate text-sm font-medium">{selectedMail.subject}</p>
              <Button aria-label="更多操作" size="icon-sm" variant="ghost"><MoreHorizontal /></Button>
            </div>
            <ScrollArea className="min-h-0 flex-1">
              <div className="p-5">
                <div className="flex items-start gap-3">
                  <Avatar>
                    <AvatarFallback>{selectedMail.initials}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold">{selectedMail.sender}</p>
                      <Badge className={cn('border-0 text-[11px]', categoryClasses[selectedMail.category])} variant="outline">
                        {selectedMail.category}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">发送给 我 · {selectedMail.date} {selectedMail.time}</p>
                  </div>
                </div>
                <h2 className="mt-7 text-xl font-semibold tracking-tight">{selectedMail.subject}</h2>
                <div className="mt-6 space-y-4 text-sm leading-7 text-foreground/85">
                  {selectedMail.body.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
                </div>
                <div className="mt-7 flex items-center gap-2 rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground">
                  <Paperclip className="size-4" />
                  <span className="flex-1 truncate">本周迭代安排.pdf</span>
                  <span>1.2 MB</span>
                </div>
                <div className="mt-6 flex gap-2">
                  <Button size="sm"><ChevronLeft className="rotate-180" />回复</Button>
                  <Button size="sm" variant="outline">转发</Button>
                </div>
              </div>
            </ScrollArea>
          </section>
        </div>
      </AppWorkspace>
    </AppPage>
  )
}
