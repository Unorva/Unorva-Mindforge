import { useState } from 'react';
import {
  Code2,
  FileText,
  Landmark,
  ListChecks,
  PenLine,
  Search,
  SearchX,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/components/ui/toast';
import { ConnectorLogo } from './connector-logo';

interface MarketDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUseSkill: (prompt: string) => void;
  skillDisabled?: boolean;
}

interface Connector {
  id: string;
  name: string;
  description: string;
  group: string;
  brand?: string;
  icon?: LucideIcon;
  iconClassName?: string;
}

interface Skill {
  title: string;
  description: string;
  category: string;
  icon: LucideIcon;
  prompt: string;
}

const CONNECTOR_GROUPS = ['精选', '广告', '数据分析'];

const connectors: Connector[] = [
  {
    id: 'finance',
    name: '金融',
    description: '安全连接金融账户',
    group: '精选',
    icon: Landmark,
    iconClassName: 'text-emerald-600',
  },
  { id: 'gmail', name: 'Gmail', description: '搜索并草拟电子邮件', group: '精选', brand: 'gmail' },
  {
    id: 'google-calendar',
    name: 'Google Calendar',
    description: '检查你的日程',
    group: '精选',
    brand: 'google-calendar',
  },
  {
    id: 'google-drive',
    name: 'Google Drive',
    description: '搜索文件和文档',
    group: '精选',
    brand: 'google-drive',
  },
  { id: 'github', name: 'GitHub', description: '搜索仓库和拉取请求', group: '精选', brand: 'github' },
  { id: 'box', name: 'Box', description: '搜索文件和文档', group: '精选', brand: 'box' },
  { id: 'canva', name: 'Canva', description: '创建和编辑设计', group: '精选', brand: 'canva' },
  { id: 'notion', name: 'Notion', description: '搜索页面和文档', group: '精选', brand: 'notion' },
  { id: 'shopify', name: 'Shopify', description: '管理你的商店', group: '精选', brand: 'shopify' },
  { id: 'stripe', name: 'Stripe', description: '查询付款', group: '精选', brand: 'stripe' },
  { id: 'vercel', name: 'Vercel', description: '管理你的部署', group: '精选', brand: 'vercel' },
  { id: 'wix', name: 'Wix', description: '管理你的 Wix 站点', group: '精选', brand: 'wix' },
  { id: 'x-ads', name: 'X Ads', description: '管理 X 广告活动', group: '广告', brand: 'x' },
  {
    id: 'bigquery',
    name: 'Google Cloud BigQuery',
    description: '查询 BigQuery 数据集',
    group: '数据分析',
    brand: 'bigquery',
  },
];

const skills: Skill[] = [
  {
    title: '写作搭档',
    description: '梳理表达思路，打磨文章结构与措辞，让内容更清晰。',
    category: '内容创作',
    icon: PenLine,
    prompt:
      '请担任我的写作搭档。先了解我的主题、目标读者和表达目的，再帮我整理大纲并改进措辞。请保留我的原意，使用清晰、自然的语言。\n\n我想写的内容是：',
  },
  {
    title: '计划拆解',
    description: '把想法变成可执行的步骤，明确优先级与完成标准。',
    category: '效率提升',
    icon: ListChecks,
    prompt:
      '请帮我把以下目标拆解成可执行的计划。请列出关键步骤、优先级、依赖关系和每一步的完成标准，并指出需要我补充的信息。\n\n我的目标与时间安排是：',
  },
  {
    title: '代码助手',
    description: '理解代码、排查问题，并给出具体的修改与验证建议。',
    category: '开发工具',
    icon: Code2,
    prompt:
      '请担任我的代码助手，结合我提供的语言、运行环境、代码和错误信息分析问题。先解释原因，再给出最小可行的修改与验证步骤；信息不足时请先提出关键问题。\n\n我遇到的问题是：',
  },
  {
    title: '内容摘要',
    description: '从长文本中提炼关键结论、待办事项与需要关注的问题。',
    category: '知识整理',
    icon: FileText,
    prompt:
      '请总结以下内容，依次给出核心结论、关键要点、待办事项和待确认问题。仅依据提供的材料，不要补充未经确认的信息，并尽量保持简洁。\n\n需要整理的内容是：',
  },
];

function EmptyResults({ onClear }: { onClear: () => void }) {
  return (
    <Empty className="py-16">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <SearchX />
        </EmptyMedia>
        <EmptyTitle>没有找到匹配的内容</EmptyTitle>
        <EmptyDescription>试试其他关键词，或查看全部内容。</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button size="sm" variant="outline" onClick={onClear}>
          清除搜索
        </Button>
      </EmptyContent>
    </Empty>
  );
}

export default function MarketDialog({
  open,
  onOpenChange,
  onUseSkill,
  skillDisabled = false,
}: MarketDialogProps) {
  const [tab, setTab] = useState('connectors');
  const [search, setSearch] = useState('');
  const [addedConnectors, setAddedConnectors] = useState<string[]>([]);
  const keyword = search.trim().toLowerCase();
  const filteredConnectors = connectors.filter((connector) =>
    `${connector.name} ${connector.description} ${connector.group}`
      .toLowerCase()
      .includes(keyword),
  );
  const filteredSkills = skills.filter((skill) =>
    `${skill.title} ${skill.description} ${skill.category}`.toLowerCase().includes(keyword),
  );

  const toggleConnector = (id: string) => {
    setAddedConnectors((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="flex h-[min(48rem,calc(100dvh-3rem))] w-[calc(100vw-2rem)] max-w-[calc(100%-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-5xl"
      >
        <DialogTitle className="sr-only">插件</DialogTitle>
        <DialogDescription className="sr-only">
          浏览并添加连接器与技能，扩展智能助手可用的能力。
        </DialogDescription>

        <Tabs
          className="flex min-h-0 flex-1 flex-col gap-0"
          value={tab}
          onValueChange={(value) => {
            setTab(String(value));
            setSearch('');
          }}
        >
          <div className="flex flex-wrap items-center gap-3 px-6 pt-5 pb-2">
            <TabsList className="h-9! gap-1 bg-transparent p-0">
              <TabsTrigger
                className="h-9! flex-none rounded-full px-4 text-muted-foreground data-active:bg-muted data-active:text-foreground data-active:shadow-none"
                value="connectors"
              >
                连接器
              </TabsTrigger>
              <TabsTrigger
                className="h-9! flex-none rounded-full px-4 text-muted-foreground data-active:bg-muted data-active:text-foreground data-active:shadow-none"
                value="skills"
              >
                技能
              </TabsTrigger>
            </TabsList>
            <div className="ml-auto flex w-full items-center gap-2 sm:w-auto">
              <InputGroup className="h-9 w-full sm:w-64">
                <InputGroupAddon>
                  <Search className="size-4" />
                </InputGroupAddon>
                <InputGroupInput
                  aria-label="搜索插件"
                  placeholder="搜索..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </InputGroup>
              <Button
                className="shrink-0 rounded-full px-4"
                size="lg"
                onClick={() =>
                  toast.add({
                    type: 'info',
                    title: '自定义连接器即将开放',
                    description: '目前可以先添加下方精选连接器。',
                  })
                }
              >
                新连接器
              </Button>
            </div>
          </div>

          <ScrollArea className="min-h-0 flex-1">
            <div className="px-6 pb-8">
              <TabsContent className="m-0" value="connectors">
                {filteredConnectors.length ? (
                  CONNECTOR_GROUPS.map((group) => {
                    const items = filteredConnectors.filter(
                      (connector) => connector.group === group,
                    );
                    if (!items.length) return null;
                    return (
                      <section key={group} className="pt-4">
                        <h3 className="pb-2 text-base font-semibold">{group}</h3>
                        <div className="grid grid-cols-1 gap-x-12 md:grid-cols-2">
                          {items.map((connector) => {
                            const added = addedConnectors.includes(connector.id);
                            return (
                              <div key={connector.id} className="flex items-center gap-3 py-4">
                                <ConnectorLogo
                                  brand={connector.brand}
                                  icon={connector.icon}
                                  iconClassName={connector.iconClassName}
                                />
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-sm font-medium">{connector.name}</p>
                                  <p className="truncate text-xs text-muted-foreground">
                                    {connector.description}
                                  </p>
                                </div>
                                <Button
                                  aria-label={
                                    added
                                      ? `移除${connector.name}连接器`
                                      : `添加${connector.name}连接器`
                                  }
                                  aria-pressed={added}
                                  className="shrink-0 rounded-full px-3.5"
                                  size="sm"
                                  variant={added ? 'outline' : 'secondary'}
                                  onClick={() => toggleConnector(connector.id)}
                                >
                                  {added ? '已添加' : '添加'}
                                </Button>
                              </div>
                            );
                          })}
                        </div>
                      </section>
                    );
                  })
                ) : (
                  <EmptyResults onClear={() => setSearch('')} />
                )}
              </TabsContent>

              <TabsContent className="m-0" value="skills">
                {filteredSkills.length ? (
                  <section className="pt-4">
                    <h3 className="pb-2 text-base font-semibold">精选</h3>
                    <div className="grid grid-cols-1 gap-x-12 md:grid-cols-2">
                      {filteredSkills.map((skill) => (
                        <div key={skill.title} className="flex items-center gap-3 py-4">
                          <ConnectorLogo
                            icon={skill.icon}
                            iconClassName="text-muted-foreground"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">{skill.title}</p>
                            <p className="truncate text-xs text-muted-foreground">
                              {skill.description}
                            </p>
                          </div>
                          <Button
                            aria-label={`使用${skill.title}技能`}
                            className="shrink-0 rounded-full px-3.5"
                            disabled={skillDisabled}
                            size="sm"
                            variant="secondary"
                            onClick={() => {
                              onUseSkill(skill.prompt);
                              onOpenChange(false);
                            }}
                          >
                            使用
                          </Button>
                        </div>
                      ))}
                    </div>
                  </section>
                ) : (
                  <EmptyResults onClear={() => setSearch('')} />
                )}
              </TabsContent>
            </div>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
