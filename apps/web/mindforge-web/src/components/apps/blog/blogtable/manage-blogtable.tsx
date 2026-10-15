import { useContext, useMemo, useState } from 'react';
import { createColumnHelper } from '@tanstack/react-table';
import { Link } from 'react-router';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { deleteBlog, saveBlog } from '@/api/blog/blog';
import { DataTable } from '@/components/data-table/data-table';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { BlogContext } from '@/context/blog-context';
import type { BlogPostType } from '@/types/apps/blog';

export default function ManageBlogTable() {
  const { posts, isLoading, error, refresh } = useContext(BlogContext);
  const [busy, setBusy] = useState(false);
  const [target, setTarget] = useState<BlogPostType | null>(null);
  const columns = useMemo(() => {
    const helper = createColumnHelper<BlogPostType>();
    return [
      helper.accessor('title', {
        header: '标题',
        cell: ({ row }) => (
          <Link className="font-medium text-primary" to={`/apps/blog/detail/${row.original.id}`}>
            {row.original.title}
          </Link>
        ),
      }),
      helper.accessor('category', { header: '分类' }),
      helper.accessor('createdAt', {
        header: '创建日期',
        cell: ({ getValue }) =>
          getValue() ? new Date(getValue()!).toLocaleDateString('zh-CN') : '—',
      }),
      helper.accessor('published', {
        header: '已发布',
        cell: ({ row }) => (
          <Switch
            aria-label={`发布 ${row.original.title}`}
            disabled={busy}
            checked={row.original.published}
            onCheckedChange={async (published) => {
              setBusy(true);
              try {
                await saveBlog({ ...row.original, published });
                await refresh();
              } catch {
                /* 请求层提供反馈。 */
              } finally {
                setBusy(false);
              }
            }}
          />
        ),
      }),
      helper.display({
        id: 'actions',
        header: '操作',
        cell: ({ row }) => (
          <div className="flex gap-1">
            <Button
              render={<Link to={`/apps/blog/edit?id=${row.original.id}`} />}
              aria-label="编辑博客"
              variant="ghost"
              size="icon-sm"
            >
              <Pencil />
            </Button>
            <Button
              aria-label="删除博客"
              disabled={busy}
              variant="ghost"
              size="icon-sm"
              onClick={() => setTarget(row.original)}
            >
              <Trash2 />
            </Button>
          </div>
        ),
      }),
    ];
  }, [busy, refresh]);
  const remove = async () => {
    if (!target?.id || busy) return;
    setBusy(true);
    try {
      await deleteBlog(target.id);
      await refresh();
      setTarget(null);
    } catch {
      /* 请求层提供反馈。 */
    } finally {
      setBusy(false);
    }
  };
  return (
    <Card>
      <CardContent className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <span className="text-sm text-muted-foreground">共 {posts.length} 篇文章</span>
          <Button render={<Link to="/apps/blog/create" />}>
            <Plus />
            新建博客
          </Button>
        </div>
        {isLoading ? (
          <p className="py-8 text-center text-sm text-muted-foreground">正在加载文章…</p>
        ) : error ? (
          <div className="text-center">
            <p className="mb-3 text-sm text-destructive">文章加载失败</p>
            <Button variant="outline" onClick={() => void refresh()}>
              重新加载
            </Button>
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={posts}
            fillHeight={false}
            searchPlaceholder="搜索博客标题或分类…"
          />
        )}
        <Dialog
          open={target !== null}
          onOpenChange={(open) => {
            if (!open && !busy) setTarget(null);
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>删除文章</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">确认删除“{target?.title}”？</p>
            <DialogFooter>
              <Button disabled={busy} variant="outline" onClick={() => setTarget(null)}>
                取消
              </Button>
              <Button disabled={busy} variant="destructive" onClick={() => void remove()}>
                {busy ? '删除中…' : '确认删除'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
