import { useEffect, useState, type SubmitEvent } from 'react';
import { getCurrentUser, updateCurrentUser, type UserProfile } from '@/api/system/users/users';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/toast';

export default function ProfileDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    let active = true;
    setLoading(true);
    setError('');
    getCurrentUser()
      .then((result) => {
        if (active) setProfile(result.data);
      })
      .catch(() => {
        if (active) setError('资料加载失败，请重新打开。');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [open]);

  const save = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!profile || saving) return;
    setSaving(true);
    try {
      const result = await updateCurrentUser({
        ...profile,
        nickname: profile.nickname.trim(),
        email: profile.email.trim(),
      });
      setProfile(result.data);
      toast.add({ type: 'success', title: '个人资料已保存' });
      window.dispatchEvent(new Event('mindforge-profile-updated'));
      onOpenChange(false);
    } catch {
      setError('保存失败，修改内容已保留。');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!saving) onOpenChange(value);
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>个人资料</DialogTitle>
        </DialogHeader>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        {loading ? (
          <p className="py-8 text-center text-sm text-muted-foreground">正在加载资料…</p>
        ) : (
          profile && (
            <form onSubmit={save} className="space-y-4">
              <Avatar className="mx-auto size-20">
                <AvatarImage src={profile.avatar} />
                <AvatarFallback>{profile.nickname?.slice(0, 1) || '我'}</AvatarFallback>
              </Avatar>
              <div className="space-y-2">
                <Label htmlFor="profile-nickname">昵称</Label>
                <Input
                  id="profile-nickname"
                  required
                  maxLength={100}
                  value={profile.nickname ?? ''}
                  onChange={(event) => setProfile({ ...profile, nickname: event.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="profile-email">邮箱</Label>
                <Input
                  id="profile-email"
                  required
                  type="email"
                  maxLength={100}
                  value={profile.email ?? ''}
                  onChange={(event) => setProfile({ ...profile, email: event.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="profile-phone">电话</Label>
                <Input
                  id="profile-phone"
                  type="tel"
                  maxLength={30}
                  value={profile.phone ?? ''}
                  onChange={(event) => setProfile({ ...profile, phone: event.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="profile-avatar">头像 URL</Label>
                <Input
                  id="profile-avatar"
                  type="url"
                  maxLength={1000}
                  value={profile.avatar ?? ''}
                  onChange={(event) => setProfile({ ...profile, avatar: event.target.value })}
                />
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  disabled={saving}
                  type="button"
                  onClick={() => onOpenChange(false)}
                >
                  取消
                </Button>
                <Button disabled={saving || !profile.nickname?.trim()} type="submit">
                  {saving ? '保存中…' : '保存资料'}
                </Button>
              </DialogFooter>
            </form>
          )
        )}
      </DialogContent>
    </Dialog>
  );
}
