import { useState } from 'react';
import { addBlogComment } from '@/api/blog/blog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { BlogType } from '@/types/apps/blog';

export default function BlogComment({
  comment,
  postId,
  onSaved,
}: {
  comment: BlogType;
  postId: string | number;
  onSaved: () => Promise<void>;
}) {
  const [reply, setReply] = useState('');
  const [showReply, setShowReply] = useState(false);
  const [saving, setSaving] = useState(false);
  const save = async () => {
    if (!reply.trim() || saving) return;
    setSaving(true);
    try {
      await addBlogComment(postId, reply.trim(), comment.id);
      await onSaved();
      setReply('');
      setShowReply(false);
    } catch {
      /* 失败保留回复。 */
    } finally {
      setSaving(false);
    }
  };
  return (
    <div className="space-y-3 rounded-lg bg-muted/40 p-4">
      <p className="text-xs text-muted-foreground">
        {comment.profile?.name || '我'} · {comment.profile?.time || '刚刚'}
      </p>
      <p className="whitespace-pre-wrap break-words text-sm">{comment.comment}</p>
      <Button size="sm" variant="ghost" onClick={() => setShowReply(!showReply)}>
        回复
      </Button>
      {showReply && (
        <div className="flex gap-2">
          <Input
            aria-label="回复评论"
            value={reply}
            maxLength={5000}
            onChange={(event) => setReply(event.target.value)}
          />
          <Button disabled={saving || !reply.trim()} onClick={() => void save()}>
            {saving ? '保存中…' : '提交'}
          </Button>
        </div>
      )}
      {comment.replies?.map((item) => (
        <div className="ml-4 rounded-lg border p-3" key={item.id}>
          <p className="text-xs text-muted-foreground">{item.profile?.name || '我'}</p>
          <p className="mt-2 whitespace-pre-wrap text-sm">{item.comment}</p>
        </div>
      ))}
    </div>
  );
}
