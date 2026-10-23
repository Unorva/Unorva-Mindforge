import { useEffect, useRef, useState, type SubmitEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { getBlogs, saveBlog } from '@/api/blog/blog';
import MarkdownEditor from '@/components/markdown/markdown-editor';
import { AppPage, AppPageHeader } from '@/components/shared/app-workspace';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/components/ui/toast';
import type { BlogPostType } from '@/types/apps/blog';

export default function BlogForm({ editing = false }: { editing?: boolean }) {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const id = params.get('id');
  const [post, setPost] = useState<Partial<BlogPostType>>({
    title: '',
    content: '',
    category: '',
    coverImg: '',
    published: false,
    featured: false,
  });
  const [loading, setLoading] = useState(editing);
  const [saving, setSaving] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const savingRef = useRef(false);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!editing) return;
    let active = true;
    getBlogs()
      .then((result) => {
        if (!active) return;
        const found = result.data.find((item) => String(item.id) === id);
        if (found) setPost(found);
        else setError('未找到文章，请从管理列表选择要编辑的文章。');
      })
      .catch(() => {
        if (active) setError('文章加载失败，请重试。');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [editing, id]);

  const save = async (content = post.content ?? '') => {
    if (savingRef.current) throw new Error('文章正在保存，请稍候。');
    if (imageUploading) {
      const message = '图片正在上传，请等待完成后保存。';
      setError(message);
      throw new Error(message);
    }
    if (!post.title?.trim() || (editing && !post.id)) {
      const message = !post.title?.trim() ? '请先填写文章标题。' : '文章尚未成功加载，无法保存。';
      setError(message);
      throw new Error(message);
    }
    savingRef.current = true;
    setSaving(true);
    setError('');
    try {
      const result = await saveBlog({
        ...post,
        content,
        title: post.title.trim(),
        category: post.category?.trim() || '未分类',
      });
      if (!result.success) throw new Error(result.message || '保存文章失败。');
      toast.add({ type: 'success', title: '文章已保存' });
      navigate('/apps/blog/manage-blog');
    } catch (error) {
      setError('保存失败，编辑内容已保留。');
      throw error;
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };
  const submit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    // 编辑器会处理保存异常；表单入口的错误已由 save 写入页面提示。
    void save().catch(() => {});
  };

  return (
    <AppPage className="gap-5 bg-transparent p-0">
      <AppPageHeader title={editing ? '编辑博客' : '新建博客'} />
      <Card>
        <CardContent className="p-5">
          {loading ? (
            <p className="text-sm text-muted-foreground">正在加载文章…</p>
          ) : (
            <form onSubmit={submit} className="space-y-5">
              {error && (
                <p role="alert" className="text-sm text-destructive">
                  {error}
                </p>
              )}
              <div className="space-y-2">
                <Label htmlFor="blog-title">标题</Label>
                <Input
                  id="blog-title"
                  required
                  maxLength={200}
                  value={post.title ?? ''}
                  onChange={(event) => setPost({ ...post, title: event.target.value })}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="blog-category">分类</Label>
                  <Input
                    id="blog-category"
                    maxLength={100}
                    value={post.category ?? ''}
                    onChange={(event) => setPost({ ...post, category: event.target.value })}
                    placeholder="未分类"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="blog-cover">封面 URL</Label>
                  <Input
                    id="blog-cover"
                    type="url"
                    maxLength={1000}
                    value={post.coverImg ?? ''}
                    onChange={(event) => setPost({ ...post, coverImg: event.target.value })}
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-6">
                <Label className="flex items-center gap-3">
                  <Switch
                    checked={post.published ?? false}
                    onCheckedChange={(published) => setPost({ ...post, published })}
                  />
                  已发布
                </Label>
                <Label className="flex items-center gap-3">
                  <Switch
                    checked={post.featured ?? false}
                    onCheckedChange={(featured) => setPost({ ...post, featured })}
                  />
                  推荐文章
                </Label>
              </div>
              <MarkdownEditor
                disabled={saving}
                value={post.content ?? ''}
                onChange={(content) => setPost((current) => ({ ...current, content }))}
                onImageUploadingChange={setImageUploading}
                onSave={save}
                minHeight={360}
                placeholder="撰写正文，支持 Markdown"
              />
              <div className="flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  disabled={saving}
                  onClick={() => navigate('/apps/blog/manage-blog')}
                >
                  取消
                </Button>
                <Button
                  type="submit"
                  disabled={
                    saving || imageUploading || !post.title?.trim() || (editing && !post.id)
                  }
                >
                  {saving ? '保存中…' : '保存文章'}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </AppPage>
  );
}
