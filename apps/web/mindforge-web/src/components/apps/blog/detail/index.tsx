import { useContext, useState } from 'react';
import { Link, useParams } from 'react-router';
import { addBlogComment } from '@/api/blog/blog';
import { BlogContext } from '@/context/blog-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import MarkdownEditor from '@/components/markdown/markdown-editor';
import BlogComment from './blog-commnets';

export default function BlogDetailData() {
  const { posts, isLoading, error, refresh } = useContext(BlogContext);
  const { id } = useParams();
  const post = posts.find(
    (item) =>
      String(item.id) === id ||
      item.title
        ?.toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^\p{L}\p{N}-]+/gu, '') === id,
  );
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);
  const submit = async () => {
    if (!post?.id || !comment.trim() || saving) return;
    setSaving(true);
    try {
      await addBlogComment(post.id, comment.trim());
      await refresh();
      setComment('');
    } catch {
      /* 保留评论输入。 */
    } finally {
      setSaving(false);
    }
  };
  if (isLoading) return <p className="py-12 text-center text-muted-foreground">正在加载文章…</p>;
  if (error || !post)
    return (
      <p className="py-12 text-center">
        {error ? '文章加载失败' : '未找到文章'}{' '}
        <Link className="text-primary underline" to="/apps/blog/manage-blog">
          返回管理
        </Link>
      </p>
    );
  return (
    <div className="space-y-5">
      <Card>
        <CardContent className="space-y-5 p-6">
          {post.coverImg && (
            <img
              className="max-h-80 w-full rounded-lg object-cover"
              src={post.coverImg}
              alt={post.title}
            />
          )}
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold">{post.title}</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {post.category} · {post.author?.name || '我'} ·{' '}
                {post.createdAt ? new Date(post.createdAt).toLocaleDateString('zh-CN') : ''}
              </p>
            </div>
            <Button variant="outline" render={<Link to={`/apps/blog/edit?id=${post.id}`} />}>
              编辑文章
            </Button>
          </div>
          <MarkdownEditor value={post.content ?? ''} disabled minHeight={200} />
        </CardContent>
      </Card>
      <Card>
        <CardContent className="space-y-4 p-6">
          <h2 className="font-semibold">评论 {post.comments?.length ?? 0}</h2>
          <Textarea
            aria-label="评论内容"
            placeholder="写下评论…"
            maxLength={5000}
            value={comment}
            onChange={(event) => setComment(event.target.value)}
          />
          <Button disabled={saving || !comment.trim()} onClick={() => void submit()}>
            {saving ? '保存中…' : '发表评论'}
          </Button>
          {post.comments?.map((item) => (
            <BlogComment key={item.id} comment={item} postId={post.id!} onSaved={refresh} />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
