import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router';
import {
  ArrowRight,
  Bot,
  BookOpen,
  ClipboardCheck,
  FolderKanban,
  Mail,
  NotebookText,
  RefreshCw,
  Wallet,
} from 'lucide-react';
import { getDashboardSummary, type DashboardSummary } from '@/api/dashboard/dashboard';
import { AppPage, AppPageHeader } from '@/components/shared/app-workspace';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatMoney } from '@/views/apps/finance/format';

const shortcuts = [
  { title: 'AI 助手', path: '/apps/ai', icon: Bot },
  { title: '项目管理', path: '/apps/projects', icon: FolderKanban },
  { title: '每日复盘', path: '/apps/daily-review', icon: ClipboardCheck },
  { title: '笔记', path: '/apps/notes', icon: NotebookText },
  { title: '博客', path: '/apps/blog/manage-blog', icon: BookOpen },
  { title: '邮件', path: '/apps/mail', icon: Mail },
];

export default function Dashboard() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    setLoading(true);
    try {
      setSummary((await getDashboardSummary()).data);
      setError('');
    } catch {
      setError('总览加载失败，请检查后端服务后重试。');
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  return (
    <AppPage className="gap-5 bg-transparent p-0">
      <AppPageHeader
        title="我的工作台"
        extra={
          <Button variant="outline" disabled={loading} onClick={() => void load()}>
            <RefreshCw />
            刷新
          </Button>
        }
      />
      <p className="text-sm text-muted-foreground">
        {new Date().toLocaleDateString('zh-CN', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          weekday: 'long',
        })}{' '}
        · 从今天最重要的一件事开始
      </p>
      {error && (
        <p
          role="alert"
          className="rounded-lg border border-destructive/30 p-4 text-sm text-destructive"
        >
          {error}
        </p>
      )}
      {loading && !summary ? (
        <p className="py-16 text-center text-sm text-muted-foreground">正在加载工作台数据…</p>
      ) : (
        summary && (
          <>
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="工作台概览">
              {[
                {
                  title: '活跃项目',
                  value: summary.activeProjectCount,
                  note: `共 ${summary.projectCount} 个项目 · ${summary.requirementCount} 项需求`,
                  path: '/apps/projects',
                  icon: FolderKanban,
                },
                {
                  title: '待解决缺陷',
                  value: summary.openDefectCount,
                  note: '保持项目质量与交付节奏',
                  path: '/apps/projects',
                  icon: ClipboardCheck,
                },
                {
                  title: '知识记录',
                  value: summary.noteCount + summary.blogCount,
                  note: `${summary.noteCount} 篇笔记 · ${summary.blogCount} 篇博客`,
                  path: '/apps/notes',
                  icon: NotebookText,
                },
                {
                  title: '复盘记录',
                  value: summary.reviewCount,
                  note: `${summary.conversationCount} 个 AI 会话 · ${summary.unreadMailCount} 封未读邮件`,
                  path: '/apps/daily-review',
                  icon: Bot,
                },
              ].map((item) => (
                <Card key={item.title}>
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>{item.title}</span>
                      <item.icon size={18} />
                    </div>
                    <p className="my-3 text-3xl font-semibold tabular-nums">{item.value}</p>
                    <p className="text-xs text-muted-foreground">{item.note}</p>
                    <Button
                      render={<Link to={item.path} />}
                      size="sm"
                      className="mt-4 px-0"
                      variant="link"
                    >
                      查看详情
                      <ArrowRight />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </section>
            <section className="grid gap-4 lg:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Wallet size={18} />
                    资金概览
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">总资产</span>
                    <span className="font-semibold">{formatMoney(summary.totalAssets)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">本月收入</span>
                    <span className="text-chart-2">{formatMoney(summary.monthIncome)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">本月支出</span>
                    <span>{formatMoney(summary.monthExpense)}</span>
                  </div>
                  <Button
                    render={<Link to="/apps/finance" />}
                    variant="outline"
                    className="mt-2 w-full"
                  >
                    管理资金
                  </Button>
                </CardContent>
              </Card>
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>快捷入口</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {shortcuts.map((item) => (
                    <Button
                      key={item.path}
                      render={<Link to={item.path} />}
                      variant="outline"
                      className="h-16"
                    >
                      <item.icon />
                      {item.title}
                    </Button>
                  ))}
                </CardContent>
              </Card>
            </section>
            <section className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>最近项目</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {summary.recentProjects.length ? (
                    summary.recentProjects.map((item) => (
                      <Link
                        className="flex items-center justify-between gap-3 rounded-lg border p-3 hover:bg-muted/40"
                        key={item.id}
                        to={`/apps/projects/${item.id}`}
                      >
                        <span className="truncate text-sm font-medium">{item.name}</span>
                        <Badge variant="secondary">{item.status}</Badge>
                      </Link>
                    ))
                  ) : (
                    <p className="py-6 text-center text-sm text-muted-foreground">
                      还没有项目，创建一个目标开始推进。
                    </p>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>最近复盘</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {summary.recentReviews.length ? (
                    summary.recentReviews.map((item) => (
                      <Link
                        className="block rounded-lg border p-3 hover:bg-muted/40"
                        key={item.id}
                        to={`/apps/daily-review?date=${item.date}`}
                      >
                        <p className="text-sm font-medium">{item.date}</p>
                        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                          {item.preview || '已保存复盘'}
                        </p>
                      </Link>
                    ))
                  ) : (
                    <p className="py-6 text-center text-sm text-muted-foreground">
                      还没有复盘，记录今天的收获与下一步。
                    </p>
                  )}
                </CardContent>
              </Card>
            </section>
          </>
        )
      )}
    </AppPage>
  );
}
